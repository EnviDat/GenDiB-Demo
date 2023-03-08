// Preferred over official QSelectOptions type
// to save ambiguity with Vue .value
export interface QSelectOptionsField {
  label: string
  id: number
}

export interface IdValueMap {
  [id: number]: string
}

export interface LabelValueMap {
  label: string
  value: number | string
}

export interface BboxObj {
  minX: number
  minY: number
  maxX: number
  maxY: number
}
