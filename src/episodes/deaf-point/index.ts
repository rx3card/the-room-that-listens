import type { Episode, Hotspot, Step } from '../../engine/types'

// id -> register entry. "named" cylinders cost a life when played; the two unnumbered ones do not.
export const cylinders = {
  prado: { named: 'Prado, Eusebio', register: 6 },
  aguirre: { named: 'Aguirre, Dolores', register: 11 },
  iriarte: { named: 'Iriarte, Mateo', register: 18 },
  ruiz: { named: 'Ruiz, Anselmo', register: 25 },
  alma: { named: 'Vale, Alma', register: 40 },
  vale: { named: null, register: -1 },
  blank: { named: null, register: -1 },
} as const
export type CylinderId = keyof typeof cylinders

export const RELAY_CODE = [41, 9] as const // first two dials count who came in, the last is where you are

const cylinderSpot = (id: CylinderId): Hotspot => ({
  id: `cyl.${id}`,
  label: `cyl.${id}.l`,
  at: 'shelf',
  steps: [
    {
      ask: `cyl.${id}.l`,
      options: [
        {
          label: 'q.play',
          then: [
            { move: 'phonograph' },
            { widget: 'crank', id },
            ...(cylinders[id].named
              ? ([
                  { say: 'rec.wax.ask', vars: { name: cylinders[id].named } },
                  { fx: 'door' },
                  { wait: 2.4 },
                  { say: 'rec.wax.after' },
                ] satisfies Step[])
              : []),
            { move: 'shelf' },
          ],
        },
        { label: 'q.leave', then: [{ say: 'rec.wax.leaves' }] },
      ],
    },
  ],
})

export const deafPoint: Episode = {
  id: 'deaf-point',
  first: 'call',
  scenes: {
    call: {
      id: 'call',
      title: 'ch.call',
      describe: 'desc.call',
      stage: 'headland',
      start: 'sea',
      hotspots: [],
      enter: [
        { fx: 'ambience', data: 'sea' },
        { say: 'rec.incoming' },
        { fx: 'flight' },
        { wait: 2 },
        { voice: 'fragment', sub: 'voice.fragment' },
        { wait: 2.5 },
        { say: 'rec.headland' },
        { wait: 3 },
        { fx: 'deafen' },
        { wait: 1.5 },
        { say: 'rec.deaf' },
        { wait: 3 },
        { voice: 'fragment2', sub: 'voice.fragment2' },
        { fx: 'arrive' },
        { wait: 5 },
        { goto: 'hall', via: 'landing' },
      ],
    },

    hall: {
      id: 'hall',
      title: 'ch.hall',
      describe: 'desc.hall',
      stage: 'headland',
      start: 'forecourt',
      enter: [
        { fx: 'chapter', data: 'ch.hall' },
        { fx: 'ambience', data: 'hall' },
        { say: 'rec.arrive' },
        { wait: 2 },
        { say: 'rec.hall.look' },
      ],
      hotspots: [
        { id: 'plate', label: 'spot.plate', at: 'forecourt', steps: [{ say: 'rec.hall.plate' }, { doc: 'plate' }, { set: 'readPlate', to: true }] },
        { id: 'box', label: 'spot.box', at: 'forecourt', steps: [{ say: 'rec.hall.box' }, { doc: 'box' }, { set: 'readOrders', to: true }] },
        { id: 'plan', label: 'spot.plan', at: 'forecourt', steps: [{ doc: 'plan' }, { say: 'rec.hall.plan', vars: { seconds: '{docSeconds}' } }, { set: 'readPlan', to: true }] },
        {
          id: 'pier',
          label: 'spot.pier',
          at: 'forecourt',
          when: s => !s.flags.leaned,
          steps: [
            { say: 'rec.hall.climb' },
            { move: 'seat' },
            { say: 'rec.hall.warm' },
            { wait: 1.5 },
            { ask: 'q.seat.cups', options: [{ label: 'q.seat.put', then: [] }] },
            { say: 'rec.hall.cups' },
            { fx: 'cups', data: true },
            { voice: 'hall', sub: 'voice.hall' },
            { widget: 'mic' },
            { wait: 1 },
            { fx: 'leanStart' },
            { say: 'rec.hall.stop' },
            { lean: { seconds: 7, flag: 'heldFirst', kind: 'breath' } },
            { fx: 'leanEnd' },
            {
              when: s => s.flags.heldFirst === true,
              then: [{ say: 'rec.hall.held', vars: { seconds: '{heldFirstSeconds}' } }],
              else: [{ say: 'rec.hall.heard', vars: { seconds: '{heldFirstSeconds}' } }],
            },
            { set: 'leaned', to: true },
            { wait: 1.6 },
            { fx: 'cups', data: false },
            { fx: 'hatch' },
            { say: 'rec.hall.open' },
          ],
        },
        { id: 'hole', label: 'spot.hole', at: 'seat', when: s => !!s.flags.leaned, steps: [{ say: 'rec.hall.down' }, { goto: 'recording', via: 'descent' }] },
        { id: 'down', label: 'spot.descend', at: 'seat', when: s => !!s.flags.leaned, to: 'forecourt' },
        { id: 'climb', label: 'spot.pier', at: 'forecourt', when: s => !!s.flags.leaned, to: 'seat' },
      ],
    },

    recording: {
      id: 'recording',
      title: 'ch.recording',
      describe: 'desc.recording',
      stage: 'wax',
      start: 'floor',
      enter: [
        { fx: 'chapter', data: 'ch.recording' },
        { fx: 'ambience', data: 'wax' },
        { say: 'rec.wax.enter' },
        { wait: 3 },
        { say: 'rec.wax.count' },
      ],
      hotspots: [
        { id: 'shelf', label: 'spot.shelf', at: 'floor', to: 'shelf', steps: [{ say: 'rec.wax.shelf' }] },
        { id: 'desk', label: 'spot.desk', at: 'floor', to: 'desk' },
        { id: 'relay', label: 'spot.relay', at: 'floor', when: s => !s.flags.relay, to: 'relay' },
        { id: 'skin', label: 'spot.skin', at: 'floor', to: 'skin' },
        ...(['prado', 'aguirre', 'iriarte', 'ruiz', 'alma', 'vale', 'blank'] as CylinderId[]).map(cylinderSpot),
        { id: 'backShelf', label: 'spot.back', at: 'shelf', to: 'floor' },
        { id: 'ledger', label: 'spot.ledger', at: 'desk', steps: [{ say: 'rec.wax.ledger' }, { doc: 'ledger' }, { set: 'readLedger', to: true }] },
        { id: 'notebook', label: 'spot.notebook', at: 'desk', steps: [{ say: 'rec.wax.note' }, { doc: 'notebook' }, { set: 'readNotebook', to: true }] },
        { id: 'gray', label: 'spot.gray', at: 'desk', steps: [{ say: 'rec.wax.plate' }, { doc: 'gray' }, { set: 'readGray', to: true }] },
        { id: 'backDesk', label: 'spot.back', at: 'desk', to: 'floor' },
        {
          id: 'dials',
          label: 'spot.relay',
          at: 'relay',
          steps: [
            { say: 'rec.wax.relay' },
            { widget: 'dials' },
            {
              when: s => s.flags.relay === true,
              then: [{ fx: 'relay' }, { say: 'rec.wax.relayYes' }, { move: 'floor' }],
              else: [{ say: 'rec.wax.relayNo' }],
            },
          ],
        },
        { id: 'backRelay', label: 'spot.back', at: 'relay', to: 'floor' },
        { id: 'readSkin', label: 'spot.skin', at: 'skin', steps: [{ doc: 'skin' }] },
        {
          id: 'push',
          label: 'spot.push',
          at: 'skin',
          when: s => s.flags.relay === true,
          steps: [
            { say: 'rec.wax.skin' },
            { lean: { seconds: 5, flag: 'pushed', kind: 'push' } },
            { when: s => s.flags.pushed === true, then: [{ say: 'rec.wax.through' }, { goto: 'impossible', via: 'membrane' }] },
          ],
        },
        { id: 'backSkin', label: 'spot.back', at: 'skin', to: 'floor' },
      ],
    },

    impossible: {
      id: 'impossible',
      title: 'ch.impossible',
      describe: 'desc.impossible',
      stage: 'spiral',
      start: 's1',
      enter: [{ fx: 'chapter', data: 'ch.impossible' }, { fx: 'ambience', data: 'spiral' }, { say: 'rec.sp.enter' }],
      hotspots: [
        { id: 'on1', label: 'spot.on', at: 's1', to: 's2', steps: [{ say: 'rec.sp.turn' }] },
        { id: 'slit', label: 'spot.slit', at: 's2', when: s => !s.flags.slit, steps: [{ fx: 'slit' }, { say: 'rec.sp.slit' }, { set: 'slit', to: true }] },
        { id: 'on2', label: 'spot.on', at: 's2', to: 's3', steps: [{ say: 'rec.sp.far' }] },
        {
          id: 'on3',
          label: 'spot.on',
          at: 's3',
          to: 's4',
          steps: [
            { fx: 'walker', data: 'approach' },
            { say: 'rec.sp.steps' },
            { wait: 4 },
            { fx: 'leanStart' },
            { lean: { seconds: 11, flag: 'heldSecond', kind: 'breath' } },
            { fx: 'leanEnd' },
            { fx: 'walker', data: 'pass' },
            {
              when: s => s.flags.heldSecond === true,
              then: [{ say: 'rec.sp.pass' }],
              else: [{ say: 'rec.sp.caught', vars: { seconds: '{heldSecondSeconds}' } }, { set: 'caught', to: true }],
            },
          ],
        },
        { id: 'up', label: 'spot.up', at: 's4', when: s => !s.flags.above, steps: [{ fx: 'lookUp' }, { say: 'rec.sp.above' }, { set: 'above', to: true }] },
        { id: 'on4', label: 'spot.on', at: 's4', to: 's5', steps: [{ say: 'rec.sp.end' }] },
        { id: 'fall', label: 'spot.hole2', at: 's5', steps: [{ say: 'rec.sp.fall' }, { goto: 'other', via: 'fall' }] },
      ],
    },

    other: {
      id: 'other',
      title: 'ch.other',
      describe: 'desc.other',
      stage: 'other',
      start: 'shore',
      enter: [
        { fx: 'chapter', data: 'ch.other' },
        { fx: 'ambience', data: 'other' },
        { say: 'rec.ot.date' },
        { wait: 3 },
        { say: 'rec.ot.yard' },
        { wait: 2.5 },
        { say: 'rec.ot.reflect' },
      ],
      hotspots: [
        {
          id: 'chairs',
          label: 'spot.chairs',
          at: 'shore',
          to: 'rows',
          steps: [
            { say: 'rec.ot.chairs' },
            { wait: 2 },
            { when: s => s.asked.some(id => cylinders[id as CylinderId].named), then: [{ say: 'rec.ot.fallen', vars: { n: '{namedCount}' } }], else: [{ say: 'rec.ot.none' }] },
          ],
        },
        { id: 'desk2', label: 'spot.desk2', at: 'rows', to: 'desk', steps: [{ say: 'rec.ot.desk' }] },
        { id: 'page', label: 'spot.page', at: 'desk', steps: [{ widget: 'transcript' }, { say: 'rec.ot.read' }, { set: 'readPage', to: true }] },
        {
          id: 'letter',
          label: 'spot.letter',
          at: 'desk',
          when: s => !!s.flags.readPage,
          steps: [
            { say: 'rec.ot.letter' },
            { doc: 'letter' },
            { voice: 'full', sub: 'voice.full' },
            { wait: 2 },
            { goto: 'last', via: 'horizon' },
          ],
        },
      ],
    },

    last: {
      id: 'last',
      title: 'ch.last',
      describe: 'desc.last',
      stage: 'none',
      start: 'line',
      hotspots: [],
      enter: [
        { fx: 'ambience', data: 'last' },
        { say: 'rec.end.choice' },
        { widget: 'final' },
        {
          when: s => s.flags.final === 'keep',
          then: [{ say: 'rec.end.keep' }, { voice: 'ruano', sub: 'cyl.ruano.t' }, { end: 'kept' }],
        },
        { when: s => s.flags.final === 'send', then: [{ say: 'rec.end.send' }, { end: 'sent' }] },
        { when: s => s.flags.final === 'stop', then: [{ say: 'rec.end.stop' }, { fx: 'seaReturns' }, { wait: 6 }, { end: 'stopped' }] },
      ],
    },
  },
}
