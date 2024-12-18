import { useEffect, useMemo, useState } from 'react';
import { Marker, Polyline } from 'react-leaflet'
import { IRoute, routeSchema, routeLengths, getCoordinateAtPercentage } from './route';
import { LCarIcon, LFlagIcon } from './LeafletIcon';
import { useHotkeys } from '@mantine/hooks';

interface IPath {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}

const driveUrl = (data: IPath) => {
	return `http://localhost:4546/ors/v2/directions/driving-car?start=${data.startY},${data.startX}&end=${data.endY},${data.endX}`
}

const fetchRoute = async (data: IPath): Promise<IRoute | null> => {
	try {
		const URI = driveUrl(data);
		const res = await fetch(URI);
		const json = await res.json();
		return routeSchema.parse(json.features[0].geometry.coordinates).map(r => [r[1], r[0]]);
	} catch {
		return null;
	}
}

const filterRoute = (
	route : IRoute, 
	routeLengthMap: {
		lengths: number[];
		totalLength: number;
	}, 
	iconPos: number,
) => {
	const totalLength = routeLengthMap.totalLength
	const startDistance = totalLength * iconPos;

	let index = 0;
	let currentLength = 0;
	while (currentLength < startDistance) {
		currentLength += routeLengthMap.lengths[index];
		index++;
	}

	return route.slice(index, route.length);
}
const Route = (props: { 
	path: IPath, 
	iconPos: number | null, 
	active: boolean, 
	isDropOff?: boolean, 
}) => {
	const [route, setRoute] = useState<null | IRoute>(null);
	const routeLengthMap = useMemo(() => routeLengths(route), [route]);

	const [log, setLog] = useState(false);
	useHotkeys([["space", () => setLog(!log)]])
	
	useEffect(() => {
		fetchRoute(props.path).then(data => {
			if (data) setRoute(data)
		})
	}, [props.path])


	if(route === null) return null;
	if(routeLengthMap === null) return null;

	let coord: [number, number] | null = null;

	if(props.iconPos !== null) {
		coord = getCoordinateAtPercentage(
			route, 
			routeLengthMap.lengths,
			routeLengthMap.totalLength,
			props.iconPos * 100
		);
	}

	if (log) {
		console.log(coord, route);
	}

	const shownRoute = props.iconPos ? filterRoute(route, routeLengthMap, props.iconPos) : [];

	return (
		<>
			{coord ? <Marker position={coord} icon={LCarIcon()} /> : null}
			<Polyline positions={shownRoute} color={"#bca0bd"} weight={props.active ? 3:1} opacity={props.active? 1: 0.8}/>
			{props.isDropOff ? <Marker position={route[route.length - 1]} icon={LFlagIcon()} /> : null}
		</>
	);

};

export default Route;
