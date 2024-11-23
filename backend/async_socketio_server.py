# simple_socketio_server_aiohttp.py
import time
from pprint import pprint

import socketio
from aiohttp import web

from main import loop_step
from scenario import (
    get_scenarios,
    init_scenario,
    run_scenario,
    get_scenario,
    scenario_status,
    create_scenario,
)

# Create a new AsyncServer
sio = socketio.AsyncServer(cors_allowed_origins="*")

# Create a new Aiohttp app
app = web.Application()
sio.attach(app)


@sio.event
async def connect(sid, environ):
    print("Client connected:", sid)


@sio.event
async def disconnect(sid):
    print("Client disconnected:", sid)


@sio.event
async def start_scenario(sid, vhs_num, cms_num, speed):
    # id_sc, speed = data
    print("Run scenario:", vhs_num, cms_num, speed)
    id_sc = create_scenario(vhs_num, cms_num)["id"]
    init_scenario(id_sc)
    run_scenario(id_sc, speed=speed)
    await loop_sc(id_sc, speed)


async def loop_sc(id_sc, speed):
    """status is 'CREATED' | 'RUNNING' | 'COMPLETED'"""
    start_remaining_time = {}
    scenario_data = get_scenario(id_sc)
    pprint(scenario_data)
    while scenario_data["status"] != "COMPLETED":
        wait_time, update_required, update_remaining_times = loop_step(id_sc)
        start_remaining_time.update(update_remaining_times)
        if update_required:
            await sio.emit(
                "update_scenario",
                {
                    "data": scenario_data,
                    "status": scenario_status(id_sc),
                    "start_remaining_time": start_remaining_time,
                },
            )
        print(f"Sleeping for {wait_time}*{speed}={wait_time*speed} seconds...")
        # time.sleep(wait_time * speed)
        await sio.sleep(wait_time * speed)
        scenario_data = get_scenario(id_sc)
    print("Scenario completed")
    pprint(get_scenario(id_sc))
    pprint(scenario_status(id_sc))


# Home route
async def index(request):
    return web.Response(text="SocketIO Server is running.", content_type="text/html")


app.router.add_get("/", index)

if __name__ == "__main__":
    web.run_app(app, host="0.0.0.0", port=9010)