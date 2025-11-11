'use client';

export type DetectedObject = {
	id: string;
	obj_id: string;
	type: string;
	score?: number;
	lat: number | string;
	lng: number | string;
	image_path?: string;
	timestamp?: string | number;
	[key: string]: any;
};


