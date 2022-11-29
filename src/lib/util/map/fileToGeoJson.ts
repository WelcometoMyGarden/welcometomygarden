import { gpx } from '@tmcw/togeojson';
import type { FeatureCollection } from '@turf/turf';

export default (file: File): Promise<FeatureCollection> => {
	return new Promise((resolve, reject) => {
		const fileExtension = file.name.split('.').pop();

		if (file && (fileExtension === 'geojson' || fileExtension === 'gpx')) {
			const reader = new FileReader();
			reader.addEventListener('load', () => {
				const contentText = <string>reader.result;
				if (contentText) {
					if (fileExtension === 'geojson') {
						return resolve(JSON.parse(contentText));
					}
					return resolve(gpx(new DOMParser().parseFromString(contentText, 'text/xml')));
				}
				return reject(new Error('Could not read the provided file.'));
			});
			reader.readAsText(file);
		} else {
			return reject(new Error('Format not supported. Please provide a .geojson or .gpx.'));
		}
	});
};
