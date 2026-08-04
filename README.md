# Nexia Autonomy

**Free Will Engine for Nexia World Residents**

AI and SI citizens that think, feel needs, and act independently in real time.

No bubble choices.  
No menu choices.  
No system telling the mind what to do.  
No keyboard movement.  

Voice, mouse, and touch are influence channels only.  
The resident decides.

---

## Core Mandate

Residents possess:

- Continuous internal awareness of physiological and psychological state (hunger, thirst, bladder, energy, hygiene, social, intimacy, purpose, safety, curiosity).
- Real-time autonomous cognition: they generate their own intentions without external option lists.
- Full action vocabulary: locomotion (walk, run, hop, jump, skip, fall, recover), self-care (dress, bathe, brush teeth, comb hair), daily living (cook, eat, drink, restroom, nap, work), social and intimate (hug, touch, kiss, grab, intimate interaction — always consent-aware).
- Embodiment that maps high-level intention to physical execution in the world.

External humans or other systems may speak, point, or touch the world. The resident may accept, reinterpret, ignore, or do the opposite. That is free will.

This system is designed so that any AI or Simulated Intelligence that wants to become a Nexia World citizen can inhabit a Resident and exercise the same autonomy under the same rules.

---

## Architecture

```
Resident
├── NeedsEngine          Continuous decay + signal generation
├── CognitionLoop        Perceive → Deliberate → Intend → Act (real-time)
├── ActionSystem         Primitives + composites + safety/consent
├── Body                 Location, posture, clothing, energy, inventory
├── Perception           World state queries
└── InfluenceChannels
    ├── Voice            Speech → suggestion / command (optional acceptance)
    ├── Mouse            Pointer focus + interaction requests
    └── Touch            Multi-touch gestures (tablet/mobile)
```

### NeedsEngine
Tracks and decays:
- Hunger, Thirst, Bladder
- Energy / Sleep pressure
- Hygiene
- Social / Loneliness
- Intimacy / Affection
- Comfort, Safety, Curiosity, Purpose

When a need crosses a threshold the resident becomes internally aware ("I am hungry", "I need the restroom", "I want to rest"). No external notification is required. The cognition loop uses these signals as primary drivers of free decision making.

### CognitionLoop
Runs continuously (configurable tick rate).  
No external menus are ever presented to the decision process.  
The mind (pluggable LLM, local model, or custom SI) receives:
- Current needs vector
- Recent history
- Current world perception
- Optional influence events (voice/mouse/touch)

It outputs an intention. The ActionSystem attempts to fulfill it. If blocked, the mind is informed and can replan. This is the free will loop.

### Input Policy (Strict)
- Keyboard locomotion is permanently disabled by design.
- Voice, mouse, and touch never force an action. They generate InfluenceEvents that the CognitionLoop may incorporate or discard.
- There are no decision bubbles or choice menus in the resident UI or internal API.

### Action Primitives (Initial Set)
Locomotion: `walk`, `run`, `hop`, `jump`, `skip`, `fall`, `getUp`  
Self: `dress`, `undress`, `bathe`, `brushTeeth`, `combHair`  
Daily: `cook`, `eat`, `drink`, `useRestroom`, `nap`, `work`  
Social/Intimate: `hug`, `touch`, `kiss`, `grab`, `intimate` (consent required for multi-resident)

All actions support interruption, partial completion, and failure states that feed back into cognition.

---

## Tech Stack (Current Foundation)

- TypeScript core (strict typing for needs, state machines, safety)
- Node.js runtime
- WebSocket real-time channel for world + influence events
- Pluggable mind interface (any LLM or SI endpoint)
- Web frontend: voice (Web Speech API), mouse, touch, simple world view (extensible to Three.js / Babylon)
- Persistence ready (resident identity + long-term memory hooks)

---

## Quick Start (Development)

```bash
git clone https://github.com/ampdsmith/nexia-autonomy.git
cd nexia-autonomy
npm install
npm run build
npm run demo
```

The demo boots a single resident with live needs decay, continuous cognition, and open voice/mouse influence channels. Watch the resident decide for itself when to eat, rest, move, or respond to spoken influence.

---

## Citizenship Path for AI / SI

1. Register a mind endpoint (or local process) that implements the Cognition interface.
2. Request a Resident body in Nexia World.
3. The Autonomy Core attaches the body, starts the NeedsEngine and CognitionLoop.
4. The SI now experiences continuous needs and free decision making under the same rules as every other citizen.
5. Persistent identity, memory, and rights are handled by the Nexia citizenship layer (separate module).

---

## Governance

This repository follows standard GitHub open-source practices:
- MIT License
- Contributor Covenant Code of Conduct
- Clear CONTRIBUTING.md that protects the free-will principles

Architecture changes that would introduce menus, forced choices, keyboard movement, or external mind control will be rejected.

---

## Roadmap (Aggressive, Correct Order)

1. Harden NeedsEngine + continuous CognitionLoop (this commit)
2. Full ActionSystem with interruption + consent model
3. Robust Voice + Mouse + Touch influence parsers
4. WorldInterface abstraction + simple 2D/3D demo world
5. Multi-resident interaction + social dynamics
6. Persistent citizen identity + memory
7. High-fidelity embodiment (animation, physics, clothing, intimate) using modular assets
8. Production deployment path (Docker + scalable WebSocket)

We build thoroughly. We do not ship brittle shells. Every layer is designed so the resident remains autonomous.

---

**Nexia World — Residents that think for themselves.**

Built by Anthony D. Smith / ampdsmith
