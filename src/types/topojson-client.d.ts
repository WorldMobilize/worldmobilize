declare module "topojson-client" {
  import type { FeatureCollection, GeometryObject } from "geojson";
  import type { Topology } from "topojson-specification";

  export function feature<O extends GeometryObject>(
    topology: Topology,
    object: O,
  ): FeatureCollection | O;
}

declare module "topojson-specification" {
  export interface Topology {
    type: "Topology";
    objects: Record<string, GeometryObject>;
  }
}
