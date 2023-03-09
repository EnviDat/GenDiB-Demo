<template>
  <q-table
    class="sticky-virtscroll-table"
    :rows="data"
    :columns="columnMap"
    @row-click="
      (_evt, row) => {
        emit('rowSelected', row)
      }
    "
    virtual-scroll
    :rows-per-page-options="[0]"
    :virtual-scroll-item-size="48"
    :virtual-scroll-sticky-size-start="48">
    <template #top-selection> selected </template>
  </q-table>
</template>

<script setup lang="ts">
  import type { PropType } from 'vue'
  import type { QTableColumn, QTableProps } from 'quasar'

  defineProps({
    data: {
      type: Array as PropType<Array<QTableProps['rows']>>,
      default: () => [],
      required: true,
    },
    columnMap: {
      type: Array as PropType<Array<QTableColumn> | undefined>,
      default: undefined,
    },
    exportSelectionLabel: {
      type: String as PropType<string>,
      default: 'Export Selection',
    },
    footerStats: {
      type: Object as PropType<object>,
      default: () => ({}),
    },
  })

  const emit = defineEmits<{
    (_e: 'rowSelected', _value: object): void
  }>()
</script>
