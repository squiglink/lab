# Squiglink Lab

The primary headphone measurement supported by this tool is the frequency response (FR) graph, which is generally considered one of the most informative metrics for evaluating headphones. An FR graph illustrates how headphones reproduce sound across a range of frequencies. In general terms, a higher level on the left side of the graph suggests more pronounced bass, while a higher level on the right side typically indicates greater treble.

## Features

### Graph window

- Standard logarithmic frequency (Hz) and sound pressure level (dB) [axes](Documentation.md#axes).
- [Colors](Documentation.md#colors) are persistent and algorithmically generated to ensure contrast.
- A slider at the left to rescale and adjust the y-axis.
- [Hover](Documentation.md#highlight-on-mouseover) over or click on a curve to see its name and highlight it.

### Toolbar

- Zoom in on bass, mid, or treble frequencies.
- [Normalize](Documentation.md#normalization) with a target loudness or a normalization frequency.
- [Smooth](Documentation.md#smoothing) graphs with a configurable parameter.
- Enable inspect mode to view numeric values when hovering over the graph.
- [Label](Documentation.md#labelling) curves directly within the graph window.
- Save a PNG [screenshot](Documentation.md#screenshot) of the graph (with labels).
- Recolor active curves to avoid color conflicts.
- The toolbar and target selector will collapse or expand based on screen size.

### Model and target selectors

- Models are organized by brand, select a brand to narrow the options.
- Click to select a specific model or brand, and unselect others, use MMB or Ctrl + LMB for multi-selection.
- [Search](Documentation.md#searching) all brands or models by name.
- Targets are selected in the same way but are separate from the models.

### Model manager

- Curve names and colors are displayed here.
- Select and compare different variants of the same model using the dropdown.
- Use the wishbone-shaped selector to view left and/or right channels, or [average](Documentation.md#averaging) them together.
- A red exclamation mark indicates that channels are [imbalanced](Documentation.md#channel-imbalance-marker).
- Adjust the offset to move graphs up or down (after [normalization](Documentation.md#normalization)).
- Select [BASELINE](Documentation.md#baseline) to flatten all curves to the chosen one.
- Temporarily hide or unhide a graph.
- Pin a model to avoid losing it while adding others.
- Click on the small dots in the bottom left to change a model's color.
