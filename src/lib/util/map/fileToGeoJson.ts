import { gpx, kml, tcx } from '@tmcw/togeojson';

export default (
  file: File
): Promise<GeoJSON.FeatureCollection<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>> => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  const validFileTypeExtensions = ['gpx', 'geojson', 'kml', 'tcx'];

  return new Promise((resolve, reject) => {
    if (!(file && fileExtension && validFileTypeExtensions.includes(fileExtension)))
      return reject(
        new Error('Format not supported. Please provide a GPX, GeoJSON, KML or TCX file.')
      );

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const contentText = <string>reader.result;
      if (!contentText) return reject(new Error('File is empty'));

      if (fileExtension === 'geojson') return resolve(JSON.parse(contentText));
      else if (fileExtension === 'gpx')
        return resolve(gpx(new DOMParser().parseFromString(contentText, 'text/xml')));
      else if (fileExtension === 'kml')
        return resolve(
          <GeoJSON.FeatureCollection<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>>(
            kml(new DOMParser().parseFromString(contentText, 'text/xml'))
          )
        );
      else if (fileExtension === 'tcx')
        return resolve(tcx(new DOMParser().parseFromString(contentText, 'text/xml')));

      return reject(
        new Error('Something went wrong. Please provide a GPX, GeoJSON, KML or TCX file.')
      );
    });

    reader.addEventListener('progress', (event) => {
      if (event.loaded && event.total) {
        const percent = (event.loaded / event.total) * 100;
        //logger.log(`File is ${Math.round(percent)}% loaded`);
      }
    });

    reader.readAsText(file);
  });
};
