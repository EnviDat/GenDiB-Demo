// Preferred over official QSelectOptions type
// to save ambiguity with Vue .value
export interface QSelectOptionsField {
  label: string
  id: number
}

export interface KeyValuePair {
  [key: string]: string
}

export interface FieldOptions {
  [key: string]: Array<string>
}

export interface LabelValueMap {
  label: string
  value: number | string
}
