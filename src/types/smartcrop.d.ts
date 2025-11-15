declare module 'smartcrop' {
	interface SmartcropCrop {
		x: number;
		y: number;
		width: number;
		height: number;
	}

	interface SmartcropResult {
		topCrop: SmartcropCrop;
	}

	interface SmartcropOptions {
		width: number;
		height: number;
		minScale?: number;
	}

	const smartcrop: {
		crop(image: HTMLImageElement | HTMLCanvasElement, options: SmartcropOptions): Promise<SmartcropResult>;
	};

	export default smartcrop;
}























