<template>
  <q-select
    ref="customSelect"
    v-bind="$attrs"
    :options="filteredOptions"
    borderless
    filled
    hide-bottom-space
    :bg-color="bgColor"
    :label-color="labelColor"
    :use-input="'filter' in $attrs ? true : undefined"
    :input-class="textColorClass"
    v-on="'filter' in $attrs ? { filter: filterFunction } : {}"
    :use-chips="'multiple' in $attrs ? true : undefined"
    :stack-label="'multiple' in $attrs ? true : undefined"
    @update:model-value="clearAndCalcLength">
    <template v-if="'multiple' in $attrs" #selected-item="{ index, opt }">
      <q-chip v-if="index === 0">
        <span v-if="nestedLabel">{{ opt.label }}</span>
        <span v-else>{{ opt }}</span>
      </q-chip>
      <span v-if="index === 1" class="text-accent text-caption"> +{{ selectionLength }} </span>
    </template>
    <template v-else #selected-item="{ opt }">
      <span v-if="nestedLabel" :class="textColorClass">{{ opt.label }}</span>
      <span v-else :class="textColorClass">{{ opt }}</span>
    </template>
  </q-select>
  <!-- :popup-content-class="textColorClass" -->
</template>

<script setup lang="ts">
  import type { PropType } from 'vue'
  import type { QSelect } from 'quasar'

  import type { QSelectOptionsField } from '@/mappings'

  const props = defineProps({
    // selection: {
    //   type: [String, {} as Array<QSelectOptionsField>] as PropType<string|QSelectOptionsField>,
    //   default: '',
    //   required: true,
    // },
    options: {
      type: Array as PropType<Array<string | QSelectOptionsField>>,
      default: () => [],
    },
    nestedLabel: {
      type: Boolean as PropType<boolean>,
      default: false,
    },
    labelColor: {
      type: String as PropType<string>,
      default: 'grey',
    },
    textColor: {
      type: String as PropType<string>,
      default: 'black',
    },
    bgColor: {
      type: String as PropType<string>,
      default: 'transparent',
    },
  })
  // const emit = defineEmits<{
  //   (_e: 'update:model-value', _value: string | QSelectOptionsField): void
  // }>()

  const customSelect: QSelect = $ref<QSelect>()
  let filteredOptions = $ref(props.options)
  let typedValue = $ref<string>()

  type FilterFn = (_callbackFn: () => void) => void
  function filterFunction(val: string, update: FilterFn) {
    update(() => {
      typedValue = val.toLowerCase()

      filteredOptions = props.options.filter((option: QSelectOptionsField | string) => {
        if (option instanceof Object && 'label' in option) {
          return option.label.toLowerCase().indexOf(typedValue) > -1
        }

        return option.toLowerCase().indexOf(typedValue) > -1
      })
    })
  }

  let selectionLength = $ref<number>()
  function clearAndCalcLength(value: Array<QSelectOptionsField | string>) {
    if (typedValue) {
      customSelect.updateInputValue('')
    }
    selectionLength = value.length - 1
  }

  const textColorClass = $computed<string>(() => {
    return props.textColor ? `text-${props.textColor}` : ''
  })
</script>
