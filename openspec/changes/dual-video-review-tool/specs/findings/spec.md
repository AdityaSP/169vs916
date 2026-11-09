## ADDED Requirements

### Requirement: Record a finding
The system SHALL provide a Start/Stop toggle that records a time range on the shared timeline. Start SHALL record exactly the current playhead time as the range start, and Stop SHALL record exactly the current playhead time as the range end, whether the videos are playing or paused. No offset SHALL be applied to either value.

#### Scenario: Start records the exact playhead
- **WHEN** the current time is 10.0 s and the user clicks Start
- **THEN** an open finding is created with start 10.0 s

#### Scenario: Start while playing
- **WHEN** the videos are playing and the user clicks Start at 5.2 s
- **THEN** the open finding start is 5.2 s

#### Scenario: Stop closes the finding
- **WHEN** a finding is open and the user clicks Stop at 15.8 s
- **THEN** the finding is saved with that end time

### Requirement: Start and Stop drive playback
Clicking Start SHALL begin playback of both videos if they are not already playing, and SHALL NOT restart or seek them if they are. Clicking Stop SHALL pause both videos if they are playing, and SHALL leave them paused if they are not. A Stop that is rejected because it is not after the start SHALL NOT pause playback. Starting a finding at the very end of the timeline SHALL NOT start playback.

#### Scenario: Start while paused
- **WHEN** the videos are paused at 3.0 s and the user clicks Start
- **THEN** the open finding start is exactly 3.0 s and both videos begin playing from there

#### Scenario: Start while playing
- **WHEN** the videos are already playing and the user clicks Start
- **THEN** playback continues without a jump and the start is the playhead time at the click

#### Scenario: Stop while playing
- **WHEN** the videos are playing and the user clicks Stop after the start
- **THEN** the finding is saved with the exact playhead time as its end and both videos pause

#### Scenario: Rejected Stop keeps playing
- **WHEN** the videos are playing and the user clicks Stop at a time at or before the open start
- **THEN** no finding is saved, the finding stays open, and playback continues

### Requirement: Overlapping findings
The system SHALL allow findings whose ranges overlap.

#### Scenario: Overlap saved
- **WHEN** a new finding overlaps an existing one
- **THEN** both findings are kept

### Requirement: Auto-close at end of video
The system SHALL close an open finding at the end of the shared timeline when playback reaches the end.

#### Scenario: Video ends while open
- **WHEN** a finding is open and the timeline ends
- **THEN** the finding is saved with end equal to the timeline end

### Requirement: Free navigation while a finding is open
The system SHALL let the user seek, scrub, play and jump to any position while a finding is open, and navigation SHALL NOT change the open finding's start.

#### Scenario: Jump around between Start and Stop
- **WHEN** a finding is open with start 6.0 s and the user scrubs or jumps to 0 s and then to 11 s
- **THEN** the open start is still 6.0 s

### Requirement: Stop must follow the start
The system SHALL reject a Stop whose time is at or before the open start, keep the finding open, and tell the user to move forward and Stop again.

#### Scenario: Stop before the start
- **WHEN** a finding is open with start 6.0 s and the user clicks Stop at 3.0 s
- **THEN** no finding is saved, the finding stays open, and a message explains the end must be after the start

### Requirement: Findings list and navigation
The system SHALL list findings for the current pair with the most recently added finding first, numbered by creation order (the newest has the highest number), and SHALL briefly highlight a finding when it is added. Clicking a finding SHALL seek both videos to 2 seconds before its recorded start (not below 0). Findings SHALL also be shown as ranges on the progress bar. The list SHALL stay visible beside the players while the user watches.

#### Scenario: Newest first
- **WHEN** the user adds a finding while others exist
- **THEN** it appears at the top of the list, is highlighted briefly, and carries the highest number

#### Scenario: Order after reload
- **WHEN** the user reloads the page and loads the same pair
- **THEN** the findings appear in the same newest-first order

#### Scenario: Jump to finding with a lead-in
- **WHEN** the user clicks a finding whose recorded start is 12.4 s
- **THEN** both videos seek to 10.4 s (2 seconds before the start) so the reviewer sees what led up to it, and the recorded start is unchanged

#### Scenario: Lead-in near the beginning
- **WHEN** the user clicks a finding whose recorded start is 1.0 s
- **THEN** both videos seek to 0 s

### Requirement: Edit a finding's start and end
The system SHALL let the user click a finding's start time or end time to edit it. Entering edit mode SHALL pause playback and move both videos to exactly that time. While editing, the edited value and the playhead SHALL stay in sync: nudging by one frame, nudging by one second, the left and right arrow keys (Shift = 10 frames), dragging or clicking the progress bar, and "Set to playhead" SHALL each move the value and the playhead together, with the videos showing the frame at that time. Playback SHALL NOT change the value. The start SHALL never pass the end (at least one frame apart); a request beyond that limit SHALL clamp the value and move the playhead to the clamped time. Edits SHALL be saved immediately, shown on the progress bar, and SHALL be ended by Done or Esc. Times SHALL be shown to hundredths of a second.

#### Scenario: Click a time to edit it
- **WHEN** the user clicks the end time of a finding
- **THEN** playback pauses, both videos show the frame at that end time, and an editor with nudge buttons appears

#### Scenario: Nudge by a frame
- **WHEN** the user clicks "1 frame ▶" while editing
- **THEN** the value moves forward by exactly one frame, and the playhead and both videos' frame numbers move with it

#### Scenario: Drag the progress bar while editing
- **WHEN** the user drags the progress bar while editing the end time
- **THEN** the end time follows the playhead live

#### Scenario: Clamp at the other endpoint
- **WHEN** the user moves the playhead earlier than the finding's start while editing the end
- **THEN** the end is set to one frame after the start and the playhead snaps to that time

#### Scenario: Persist edits
- **WHEN** the user edits a time and reloads the page
- **THEN** the edited time is still shown

### Requirement: Delete and notes
The system SHALL allow deleting any finding and SHALL allow an optional text note on each finding.

#### Scenario: Delete
- **WHEN** the user deletes a finding
- **THEN** it is removed from the list, the bar, and storage

#### Scenario: Add a note
- **WHEN** the user enters a note for a finding
- **THEN** the note is saved with the finding

### Requirement: Persistence
The system SHALL persist findings per pair in localStorage, keyed by the pair's two paths, and SHALL restore them when the pair is loaded again. If storage is unavailable the system SHALL keep working in memory.

#### Scenario: Reload page
- **WHEN** the user reloads the page and loads the same pair
- **THEN** previously saved findings are shown

#### Scenario: Storage blocked
- **WHEN** localStorage access throws
- **THEN** the tool still works for the session without persistence

### Requirement: Frame numbers in the export
When a video's frame rate is known, the export SHALL include that frame rate per video (`fps.a`, `fps.b`) and, for every finding, the start and end frame number (counted from 0) in each video (`frames.a.start`, `frames.a.end`, `frames.b.start`, `frames.b.end`). The frame rate SHALL be saved with the pair's findings so that "Export all" includes frame numbers for pairs that are not currently loaded. Seconds remain the source of truth.

#### Scenario: Frames in the export
- **WHEN** a finding from 3.0 s to 4.5 s is exported for two 25 fps videos
- **THEN** it carries `frames.a` = {start 75, end 112} and `frames.b` = {start 75, end 112}, and the file carries `fps` = {a 25, b 25}

### Requirement: Import an exported file
The system SHALL provide an Import control that accepts a file produced by Export JSON (one pair) or Export all (several pairs). It SHALL load the video pair named in the file from its paths, and SHALL merge the file's findings (start, end and note) into the findings already saved for that pair, without adding a finding that is already present (same start, end and note). For a file with several pairs it SHALL load the first and save the rest, adding them to the recent pairs. It SHALL report how many findings were imported, how many were already present and how many were skipped. It SHALL reject a file that is not valid JSON or not an export from this tool, and SHALL reject pairs whose paths are not on this server, in each case with a message and without changing existing findings. If the videos cannot be loaded, the findings SHALL still be saved.

#### Scenario: Round trip
- **WHEN** the user exports a pair's findings, clears the browser's saved data, and imports the same file
- **THEN** the same pair loads with identical findings

#### Scenario: Importing twice
- **WHEN** the user imports the same file a second time
- **THEN** no duplicate findings are added and the message says they were already present

#### Scenario: Wrong kind of file
- **WHEN** the user imports a JSON file that is not an export from this tool
- **THEN** a message says so and nothing changes

#### Scenario: Several pairs
- **WHEN** the user imports an Export-all file
- **THEN** the first pair loads with its findings, and the other pairs' findings are saved and the pairs appear in the recent list

### Requirement: JSON export
The system SHALL export findings as a JSON file containing the pair's paths and a `findings` array of `{start, end, note?}` with times in seconds, ordered by start time. It SHALL export the current pair, and SHALL also offer an Export all action covering every saved pair.

#### Scenario: Export current pair
- **WHEN** the user clicks Export
- **THEN** a JSON file downloads with the pair's video paths and its findings

#### Scenario: Export all
- **WHEN** the user clicks Export all
- **THEN** a JSON file downloads containing an entry for each pair that has saved findings
