## ADDED Requirements

### Requirement: Load a video pair from two paths
The system SHALL provide two text inputs for video paths and a Load control. Paths SHALL be resolved relative to the page URL, and the system SHALL load only same-origin paths.

#### Scenario: Valid pair loads
- **WHEN** the user enters two valid relative paths under `media/` and clicks Load
- **THEN** both videos load and are displayed side by side

#### Scenario: Cross-origin path rejected
- **WHEN** the user enters a path or URL that resolves to a different origin
- **THEN** the system rejects it, shows an error next to that input, and does not load it

### Requirement: Orientation-based layout
The system SHALL detect each video's orientation from its intrinsic dimensions and place the landscape video on the left and the portrait video on the right, regardless of input order.

#### Scenario: Inputs entered in reverse order
- **WHEN** the portrait path is entered in the first input and the landscape path in the second
- **THEN** the landscape video is still shown on the left and the portrait video on the right

#### Scenario: Same orientation
- **WHEN** both videos have the same orientation
- **THEN** the system keeps input order and shows a warning

### Requirement: Load error reporting
The system SHALL show a clear error next to the failing input when a video cannot be loaded (for example 404 or unsupported codec) and SHALL NOT leave a blank player without explanation.

#### Scenario: Missing file
- **WHEN** a path points to a file that does not exist
- **THEN** an error message appears next to that input and playback controls remain disabled

### Requirement: Recent pairs
The system SHALL remember recently loaded pairs in localStorage and offer them as one-click choices that load the pair.

#### Scenario: Reload a recent pair
- **WHEN** the user clicks a recent pair
- **THEN** both path inputs are filled and the pair is loaded

### Requirement: Deep links
The system SHALL load a pair on startup when the URL contains `a` and `b` query parameters, subject to the same-origin rule.

#### Scenario: Open via link
- **WHEN** the page is opened with `?a=media/x.mp4&b=media/y.mp4`
- **THEN** the inputs are filled and the pair loads automatically

### Requirement: Collapsible inputs
The system SHALL keep the path inputs in a panel that can be shown or hidden from the top bar. The panel SHALL be open while no pair is loaded, SHALL collapse after a pair loads successfully, and SHALL open again when a load fails so the error is visible. The top bar SHALL show the loaded pair's file names.

#### Scenario: Collapse after load
- **WHEN** a pair loads successfully
- **THEN** the inputs panel collapses and the top bar shows the two file names

#### Scenario: Failed load keeps inputs visible
- **WHEN** a load fails (for example a 404)
- **THEN** the inputs panel is open and shows the error next to the failing input

#### Scenario: Reopen to change videos
- **WHEN** the user clicks the pair button in the top bar
- **THEN** the inputs panel opens, pre-filled with the current paths

### Requirement: Switching pairs
The system SHALL pause playback and discard any open (unclosed) finding start when a different pair is loaded, and SHALL show the findings saved for the newly loaded pair.

#### Scenario: Switch with open start
- **WHEN** a finding start is open and the user loads another pair
- **THEN** the open start is discarded and the new pair's saved findings are shown
