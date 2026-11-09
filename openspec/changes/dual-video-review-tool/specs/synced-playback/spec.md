## ADDED Requirements

### Requirement: Single play control
The system SHALL provide one play/pause control that starts and pauses both videos together, and SHALL hide the native per-video controls.

#### Scenario: Play both
- **WHEN** the user clicks play
- **THEN** both videos start playing

#### Scenario: Pause both
- **WHEN** the user clicks pause while playing
- **THEN** both videos pause

### Requirement: Readiness gating
The system SHALL enable playback only after both videos are ready to play.

#### Scenario: One video still loading
- **WHEN** only one video has become ready
- **THEN** the play control remains disabled

### Requirement: Single progress bar
The system SHALL provide one progress bar on a shared timeline that reflects current time and, when scrubbed, seeks both videos to the same time. It SHALL display current time and total duration.

#### Scenario: Scrub
- **WHEN** the user drags the progress bar to a time
- **THEN** both videos seek to that time

#### Scenario: Progress follows playback
- **WHEN** the videos play
- **THEN** the bar position and time display advance with the shared timeline

### Requirement: Buffering coordination
The system SHALL pause both videos if either one stalls to buffer and SHALL resume both together once both can play.

#### Scenario: One video stalls
- **WHEN** one video fires a buffering stall during playback
- **THEN** both videos pause, and resume together when both are ready

### Requirement: Drift correction
While playing, the system SHALL periodically compare the two videos and resynchronize the follower to the master when they differ by more than 0.15 seconds.

#### Scenario: Drift exceeds threshold
- **WHEN** the follower is more than 0.15 seconds from the master during playback
- **THEN** the follower's time is set to the master's time

### Requirement: Single audio source
The system SHALL play audio from only one video at a time, and SHALL let the user choose which with an audio button on each video's pane that shows whether that video is the audible one.

#### Scenario: Default audio
- **WHEN** playback starts
- **THEN** only the landscape video is audible

### Requirement: Differing durations
When the two videos differ in length by more than 0.1 s, the system SHALL use the shorter duration for the shared timeline and SHALL point the difference out in three places: a prominent alert that names both lengths, which video is longer, by how much, and that the extra part cannot be reviewed; a "longer" or "shorter" marker on each video's length; and a note under the progress bar stating where the timeline ends.

#### Scenario: Unequal lengths
- **WHEN** Video A is 12.0 s and Video B is 9.0 s
- **THEN** the progress bar spans 9.0 s, an alert says Video A is 3.0 s longer and its last 3.0 s cannot be reviewed, Video A's length is marked "3.0 s longer", Video B's is marked "shorter", and the timeline note says it ends at 0:09.0

#### Scenario: Equal lengths
- **WHEN** both videos have the same length (within 0.1 s)
- **THEN** no mismatch alert, marker or timeline note is shown

### Requirement: Reaching the end
The system SHALL pause both videos when the shared timeline end is reached.

#### Scenario: End of timeline
- **WHEN** playback reaches the end of the shared timeline
- **THEN** both videos are paused at the end

### Requirement: Playback speed
The system SHALL provide a speed control (0.25x, 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x) that applies the same rate to both videos, keeps them in sync at that rate, and keeps the chosen rate across seeks and when another pair is loaded.

#### Scenario: Change speed
- **WHEN** the user selects 2x
- **THEN** both videos play at twice normal speed and stay in sync

#### Scenario: Speed persists
- **WHEN** the user has selected 0.5x and loads another pair
- **THEN** both videos of the new pair play at 0.5x
