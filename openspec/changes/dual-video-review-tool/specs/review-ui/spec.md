## ADDED Requirements

### Requirement: Framed video panes
The system SHALL show each video in its own labelled pane containing a header (input tag A or B, orientation and aspect ratio such as "Landscape · 16:9", file name, and the audio button) and a footer (resolution and length). Before a pair is loaded the panes SHALL show a "No video loaded" placeholder. Both videos SHALL be displayed at the same height.

#### Scenario: Loaded pane details
- **WHEN** a 640x360 landscape video is loaded as Video A
- **THEN** its pane shows "Landscape · 16:9", the file name, "640×360" and its length

#### Scenario: Empty panes
- **WHEN** no pair is loaded
- **THEN** both panes show a "No video loaded" placeholder

### Requirement: Frame numbers
The system SHALL show, on each video's pane, the number of the frame currently on screen (starting at 0) together with the video's frame rate, and SHALL show each finding's start and end frame numbers for both videos. The frame rate SHALL be read from the MP4 file header when possible (using small Range requests, and reading only the first 2 MB if the server ignores Range), and otherwise estimated from presented-frame timing during playback and marked as estimated. While the frame rate is unknown the pane SHALL show a dash instead of a frame number.

#### Scenario: Frame number while paused
- **WHEN** a 25 fps video is paused at 2.0 s
- **THEN** its pane shows "Frame 50 · 25 fps"

#### Scenario: Frame rate estimated
- **WHEN** the frame rate cannot be read from the file and the video plays for a moment
- **THEN** the pane shows an estimated frame rate (for example "~25 fps") and frame numbers

#### Scenario: Findings show frames
- **WHEN** a finding exists and both frame rates are known
- **THEN** its row shows the start and end frame for Video A and Video B

### Requirement: Maximised viewing area
The system SHALL place the findings beside the players on wide screens, so the videos and the findings are visible together, and SHALL stack them on narrow screens without horizontal scrolling.

#### Scenario: Wide screen
- **WHEN** the window is wider than 1100 px
- **THEN** the findings panel is shown to the right of the panes and transport controls

#### Scenario: Phone width
- **WHEN** the window is 390 px wide
- **THEN** the panes and findings stack vertically and the page does not scroll horizontally

### Requirement: Light and dark themes
The system SHALL support light and dark themes, SHALL follow the operating system preference by default, and SHALL let the user cycle between auto, light and dark with a top-bar button. The choice SHALL be remembered across reloads when storage is available.

#### Scenario: Follow the OS
- **WHEN** the theme is Auto and the OS prefers dark
- **THEN** the page renders in the dark theme

#### Scenario: Override and remember
- **WHEN** the user selects Dark and reloads the page
- **THEN** the page is still dark

### Requirement: Space toggles playback
The system SHALL toggle play and pause when the user presses Space while focus is not in a text field, select or button.

#### Scenario: Space plays and pauses
- **WHEN** a pair is loaded and the user presses Space
- **THEN** both videos play, and pressing Space again pauses both
