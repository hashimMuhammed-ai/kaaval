/**
 * PostGIS Spatial Query & GiST Index Utilities.
 *
 * Implements index-accelerated spatial SQL expressions for PostGIS:
 * 1. GiST Bounding Box Operator (&&) for fast spatial pruning via R-Tree GiST index
 * 2. ST_DWithin on WGS84 geography for accurate ellipsoidal radius filtering
 * 3. ST_Distance on geography for exact distance calculation in kilometers
 * 4. PostGIS k-Nearest Neighbors (<->) operator for index-driven proximity ordering
 */
export class PostgisSpatialHelper {
  /**
   * Approximate degrees for a given distance in kilometers.
   * 1 degree of latitude is approximately 111.32 kilometers.
   */
  static kmToDegrees(km: number): number {
    return km / 111.32;
  }

  /**
   * Converts kilometers to meters for ST_DWithin geography queries.
   */
  static kmToMeters(km: number): number {
    return km * 1000;
  }

  /**
   * SQL fragment for GiST bounding box operator (&&) with ST_Expand.
   * Leverages the GiST index directly on geometry(Point, 4326).
   *
   * @example
   * PostgisSpatialHelper.buildBoundingBoxFilter('caregivers.location', ':lng', ':lat', 25)
   * // -> "caregivers.location && ST_Expand(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), 0.224578)"
   */
  static buildBoundingBoxFilter(
    column: string,
    lngParam: string,
    latParam: string,
    radiusKm: number
  ): string {
    const degrees = this.kmToDegrees(radiusKm);
    return `${column} && ST_Expand(ST_SetSRID(ST_MakePoint(${lngParam}, ${latParam}), 4326), ${degrees.toFixed(6)})`;
  }

  /**
   * SQL fragment for ST_DWithin radius filtering on geography.
   * Uses meters as the unit on WGS84 ellipsoid.
   *
   * @example
   * PostgisSpatialHelper.buildDWithinFilter('caregivers.location', ':lng', ':lat', ':radiusMeters')
   * // -> "ST_DWithin(caregivers.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radiusMeters)"
   */
  static buildDWithinFilter(
    column: string,
    lngParam: string,
    latParam: string,
    radiusMetersParam: string
  ): string {
    return `ST_DWithin(${column}::geography, ST_SetSRID(ST_MakePoint(${lngParam}, ${latParam}), 4326)::geography, ${radiusMetersParam})`;
  }

  /**
   * SQL fragment calculating distance in kilometers between column location and target point.
   */
  static buildDistanceKmSelect(
    column: string,
    lngParam: string,
    latParam: string,
    alias: string = 'distance_km'
  ): string {
    return `ROUND((ST_Distance(${column}::geography, ST_SetSRID(ST_MakePoint(${lngParam}, ${latParam}), 4326)::geography) / 1000.0)::numeric, 2) AS ${alias}`;
  }

  /**
   * SQL fragment for index-driven k-Nearest Neighbors (<->) ordering.
   * Enables PostGIS GiST index to sort by proximity in O(log N) time.
   */
  static buildKnnOrderBy(
    column: string,
    lngParam: string,
    latParam: string,
    direction: 'ASC' | 'DESC' = 'ASC'
  ): string {
    return `${column} <-> ST_SetSRID(ST_MakePoint(${lngParam}, ${latParam}), 4326) ${direction}`;
  }
}
