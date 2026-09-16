import { categoryService } from './categoryService'
import { itemService } from './itemService'
import { locationService } from './locationService'
import { tagService } from './tagService'

/**
 * Dev-only fixture generator. Every call site is gated behind
 * `import.meta.env.DEV`, so Vite/Rollup dead-code-eliminates this whole
 * module out of production builds (see docs/REQUIREMENTS.md: "never
 * bundled into production builds").
 */
export async function generateSampleData(): Promise<void> {
  const keller = await locationService.createLocation({ name: 'Keller' })
  const regal1 = await locationService.createLocation({ name: 'Regal 1', parentId: keller.id })
  const regal3 = await locationService.createLocation({ name: 'Regal 3', parentId: keller.id })
  const fachB = await locationService.createLocation({ name: 'Fach B', parentId: regal3.id })
  const dachboden = await locationService.createLocation({ name: 'Dachboden' })
  const garage = await locationService.createLocation({ name: 'Garage' })

  const werkzeug = await categoryService.createCategory({ name: 'Werkzeug', icon: '🔧' })
  const elektro = await categoryService.createCategory({ name: 'Elektrowerkzeug', icon: '🔌', parentId: werkzeug.id })
  const haushalt = await categoryService.createCategory({ name: 'Haushalt', icon: '🏠' })
  const dekoration = await categoryService.createCategory({ name: 'Dekoration', icon: '🎄' })
  const sport = await categoryService.createCategory({ name: 'Sport & Freizeit', icon: '🚴' })

  const outdoorTag = await tagService.resolveTagIds(['Outdoor'])
  const saisonalTag = await tagService.resolveTagIds(['Saisonal'])
  const verliehenTag = await tagService.resolveTagIds(['Verliehen'])

  await itemService.createItem({
    name: 'Bosch Bohrmaschine',
    categoryId: elektro.id,
    locationId: regal1.id,
    quantity: 1,
    manufacturer: 'Bosch',
    model: 'PSB 750 RCE',
    condition: 'good',
    purchaseDate: '2019-03-12',
    purchasePrice: 79.99,
    currentValue: 40,
  })

  await itemService.createItem({
    name: 'Akkuschrauber',
    categoryId: elektro.id,
    locationId: regal1.id,
    quantity: 1,
    manufacturer: 'Makita',
    condition: 'good',
    purchasePrice: 129,
    currentValue: 90,
  })

  await itemService.createItem({
    name: 'Verlängerungskabel',
    categoryId: werkzeug.id,
    locationId: regal1.id,
    quantity: 3,
    unit: 'Stk.',
    condition: 'good',
  })

  await itemService.createItem({
    name: 'Hochdruckreiniger',
    categoryId: haushalt.id,
    locationId: garage.id,
    quantity: 1,
    manufacturer: 'Kärcher',
    model: 'K5',
    condition: 'good',
    purchaseDate: '2021-06-01',
    purchasePrice: 349,
    currentValue: 220,
    tagIds: outdoorTag,
  })

  await itemService.createItem({
    name: 'Campingstuhl',
    categoryId: sport.id,
    locationId: fachB.id,
    quantity: 4,
    unit: 'Stk.',
    condition: 'good',
    tagIds: outdoorTag,
  })

  await itemService.createItem({
    name: 'Kinderfahrrad',
    categoryId: sport.id,
    locationId: garage.id,
    quantity: 1,
    condition: 'fair',
    tagIds: verliehenTag,
    notes: 'Verliehen an Nachbarn, Rückgabe im Frühjahr geplant.',
  })

  await itemService.createItem({
    name: 'Weihnachtsdekoration',
    categoryId: dekoration.id,
    locationId: dachboden.id,
    quantity: 1,
    unit: 'Kiste',
    condition: 'good',
    tagIds: saisonalTag,
  })
}
