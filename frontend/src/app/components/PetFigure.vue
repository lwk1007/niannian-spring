<template>
  <div v-if="photo" class="pet-photo">
    <img :src="photo" :alt="alt" />
  </div>
  <div v-else class="pet-figure" v-html="svg"></div>
</template>

<script setup>
import { computed } from 'vue'
import { petSVG } from '../../shared/pets.js'

const props = defineProps({
  photo: { type: String, default: '' },
  type: { type: String, default: 'cat' },
  alt: { type: String, default: '它的样子' }
})

const svg = computed(() => petSVG(props.type || 'cat'))
</script>
