'use client';

import { Box } from '@mui/material';
import type { DetectedObject } from '../types/detection';

export default function DetectionPopup({ object, imagePath }: { object: DetectedObject; imagePath?: string }) {
	const lat = typeof object.lat === 'number' ? object.lat.toFixed(6) : object.lat;
	const lng = typeof object.lng === 'number' ? object.lng.toFixed(6) : object.lng;

	return (
		<Box
			sx={{
				minWidth: 260,
				maxWidth: 320,
				bgcolor: 'rgba(24,24,27,0.95)',
				color: 'white',
				borderRadius: 2,
				border: '1px solid rgba(63,63,70,1)',
				boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
				p: 1.5,
				fontFamily: 'ui-sans-serif, system-ui, -apple-system',
			}}
		>
			<Box sx={{ fontWeight: 800, color: '#f59e0b', mb: 0.75, letterSpacing: 0.25 }}>
				{object.type?.toUpperCase?.() || 'OBJECT'}
			</Box>
			<Box sx={{ fontSize: 12, color: '#d4d4d8' }}>ID: {object.obj_id || object.id}</Box>
			<Box sx={{ fontSize: 12, color: '#d4d4d8', mt: 0.5 }}>LAT: {lat}</Box>
			<Box sx={{ fontSize: 12, color: '#d4d4d8' }}>LNG: {lng}</Box>
			{(imagePath || object.image_path) && (
				<Box sx={{ mt: 1, borderRadius: 1, overflow: 'hidden', border: '1px solid rgba(63,63,70,1)' }}>
					<img
						src={(imagePath || object.image_path) as string}
						alt={object.type || 'object'}
						style={{ display: 'block', width: '100%', height: 'auto' }}
					/>
				</Box>
			)}
		</Box>
	);
}


