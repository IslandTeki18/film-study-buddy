# Source games — screen spec & user flows

Screen inside an opponent workspace. Tab route: `tab: 'sources'`.
Purpose: the coach declares which film the opponent picture is built from. Everything downstream (charted snap counts, tendency percentages, alerts, reports) is scoped to the games marked **in**.

Reference implementation: `Film Room.dc.html` (Design Component — template + `class Component extends DCLogic`).

---

## State

```js
// component state
activeSource: 0,            // index into gameList — the game charting is scoped to
gameList: [                 // the source games attached to this opponent
  { wk, name, date, snaps, charted, on }
],
pool: [                     // available-but-unattached film ("Hudl library")
  { wk, name, date, snaps, charted }
]
```

`gameList` seeds from `SOURCE_GAMES`, `pool` from `SOURCE_POOL`. `on` replaced an older parallel
`sources: [bool]` array — a single list keeps add/remove/reorder coherent.

Derived per render:

```js
usedSources = gameList.filter(g => g.on).length
nextPool    = pool[0]
```

---

## Layout

Header row: title + subhead (`The film this opponent picture is built from. You decide what counts.`)
with the bulk filter buttons right-aligned on the same line, wrapping below on narrow widths.

Table, `min-width: 680px` inside an `overflow-x: auto` bordered container. Seven columns:

| col | width | content |
|---|---|---|
| Wk | 64px | `g.wk` |
| Game | `minmax(0,1.4fr)` | `g.name`, ellipsised |
| Date | 92px | `g.date` |
| Snaps | 78px | total snaps in the film |
| Charted | 104px | `N snaps` (accent) or `none yet` (muted) |
| Use | 84px | in/out pill, right-aligned |
| — | 30px | `×` remove, right-aligned |

Footer row: add-source button + footnote.

---

## Flows

### 1. Open a game into charting (primary)

Trigger: click anywhere on the row.

```js
open: () => this.setState({ activeSource: gi, tab: 'data', dataTab: 'charting' })
```

- Navigates to Opponent data → Charting.
- The header film indicator reads `Hudl · {gameList[activeSource].name} · clip 24`.
- The active row carries `box-shadow: inset 3px 0 0 <accent>` and `background:#141821`.
- Row hover: `background:#151922`. Cursor `pointer`. `title="Chart {name}"`.

**Not yet built:** charting does not actually filter logged snaps by `activeSource` — the
scoping is presentational. Wire `plays` to carry a `sourceIdx` and filter on it.

### 2. Include / exclude a game

Trigger: the `in` / `out` pill. **Must call `e.stopPropagation()`** so it doesn't fire flow 1.

```js
toggle: (e) => { e.stopPropagation();
  this.setState(s => ({ gameList: s.gameList.map((v, i) =>
    i === gi ? { ...v, on: !v.on } : v) })); }
```

- `in` = filled accent pill, dark text. `out` = outlined, muted text.
- Immediately updates Overview's `Source games: N of M` and Tendencies' `N charted snaps from M source games`.

### 3. Remove a game

Trigger: the `×` button. Also `stopPropagation()`.

```js
remove: (e) => { e.stopPropagation();
  this.setState(s => ({
    gameList: s.gameList.filter((v, i) => i !== gi),
    pool: s.pool.concat([{ wk, name, date, snaps, charted: 0 }]),
    activeSource: s.activeSource >= gi && s.activeSource > 0
      ? s.activeSource - 1 : s.activeSource
  })); }
```

- The film returns to `pool`, so it can be re-added. Charted count resets to 0 on the way out.
- `activeSource` shifts down so it never dangles past the end of the list.
- No confirmation dialog. Consider an undo toast rather than a modal — removal is cheap to reverse via flow 4.

### 4. Add a source game

Trigger: the dashed footer button. Pulls `pool[0]`, added with `on: true`.

```js
addSource: () => {
  if (!this.state.pool.length) return;
  this.setState(s => ({
    gameList: s.gameList.concat([{ ...s.pool[0], on: true }]),
    pool: s.pool.slice(1)
  }));
}
```

- Label names the specific film: `+ add Wk 4 — Salem Hills vs Orem`.
- Exhausted: label becomes `no more film available`, color `#4e5566`, `cursor: not-allowed`.
- Footnote: `{pool.length} more in your Hudl library`, or `all available film added`.

**Production note:** this is a one-tap "next available" shortcut standing in for a real picker.
Against the live Hudl library this should open a film browser (search, season filter, multi-select).

### 5. Bulk scope

Three buttons, all operating through one helper:

```js
setAll = (fn) => this.setState(s => ({
  gameList: s.gameList.map((v, i) => ({ ...v, on: fn(v, i) })) }));

'all in'        -> setAll(() => true)
'last 2 weeks'  -> setAll((v, i) => i < 2)
'none'          -> setAll(() => false)
```

`last 2 weeks` uses list position, not real dates — `gameList` is ordered newest-first.
Against real data, compare `date` against the opponent's game date.

### 6. Read the inventory (passive)

The Charted column is the "what's left to do" signal: `24 snaps` vs `none yet`. It is the main
reason a coach opens this screen without changing anything.

---

## Downstream dependencies

Changing `on` must invalidate:

- Overview → `Source games` row (`N of M`)
- Overview → `Charted snaps`, `Must review snaps`
- Tendencies / alerts → `tendSub`, all frequency tables, alert thresholds
- Reports → any report whose status depends on snap volume

Currently only the Overview counts and `tendSub` recompute. Frequency tables read the full
`plays` array and ignore `on`.

---

## Gaps / open items

1. Charting is not actually filtered by `activeSource` (flow 1).
2. Tendency and frequency tables ignore include/exclude (flow 2).
3. No reorder (drag rows) — `last 2 weeks` assumes newest-first ordering holds.
4. No per-snap attribution — you can't see which source game a charted snap came from.
5. `+ add source game` should become a real library picker.
6. No undo on remove.
7. Empty state undefined: what the table shows when `gameList` is empty.
