import { PostgisSpatialHelper } from './spatial-query.helper';

describe('PostgisSpatialHelper', () => {
  describe('Unit Conversions', () => {
    it('should correctly convert kilometers to meters', () => {
      expect(PostgisSpatialHelper.kmToMeters(5)).toBe(5000);
      expect(PostgisSpatialHelper.kmToMeters(25)).toBe(25000);
      expect(PostgisSpatialHelper.kmToMeters(0)).toBe(0);
    });

    it('should correctly convert kilometers to approximate degrees', () => {
      const degrees = PostgisSpatialHelper.kmToDegrees(111.32);
      expect(degrees).toBeCloseTo(1.0, 3);

      const degrees25km = PostgisSpatialHelper.kmToDegrees(25);
      expect(degrees25km).toBeCloseTo(0.2245, 3);
    });
  });

  describe('SQL Expression Generators for GiST Spatial Index', () => {
    it('should build bounding box filter using GiST && operator and ST_Expand', () => {
      const sql = PostgisSpatialHelper.buildBoundingBoxFilter(
        'caregivers.location',
        ':targetLng',
        ':targetLat',
        25
      );

      expect(sql).toContain('caregivers.location && ST_Expand(');
      expect(sql).toContain('ST_SetSRID(ST_MakePoint(:targetLng, :targetLat), 4326)');
      expect(sql).toContain('0.224578');
    });

    it('should build ST_DWithin geography filter for exact radius checks', () => {
      const sql = PostgisSpatialHelper.buildDWithinFilter(
        'caregivers.location',
        ':targetLng',
        ':targetLat',
        ':radiusMeters'
      );

      expect(sql).toBe(
        'ST_DWithin(caregivers.location::geography, ST_SetSRID(ST_MakePoint(:targetLng, :targetLat), 4326)::geography, :radiusMeters)'
      );
    });

    it('should build ST_Distance calculation in kilometers', () => {
      const sql = PostgisSpatialHelper.buildDistanceKmSelect(
        'caregivers.location',
        ':targetLng',
        ':targetLat',
        'dist_km'
      );

      expect(sql).toBe(
        'ROUND((ST_Distance(caregivers.location::geography, ST_SetSRID(ST_MakePoint(:targetLng, :targetLat), 4326)::geography) / 1000.0)::numeric, 2) AS dist_km'
      );
    });

    it('should build KNN order by clause using GiST <-> operator', () => {
      const sqlAsc = PostgisSpatialHelper.buildKnnOrderBy(
        'caregivers.location',
        ':targetLng',
        ':targetLat'
      );
      expect(sqlAsc).toBe(
        'caregivers.location <-> ST_SetSRID(ST_MakePoint(:targetLng, :targetLat), 4326) ASC'
      );

      const sqlDesc = PostgisSpatialHelper.buildKnnOrderBy(
        'caregivers.location',
        ':targetLng',
        ':targetLat',
        'DESC'
      );
      expect(sqlDesc).toBe(
        'caregivers.location <-> ST_SetSRID(ST_MakePoint(:targetLng, :targetLat), 4326) DESC'
      );
    });
  });
});
