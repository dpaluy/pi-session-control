# Session Control

**Version: 0.1.0** · [Changelog](CHANGELOG.md)

Send messages between running Pi sessions, retrieve their latest responses, and ask for activity summaries.

![Session Control workflow: discover a named session, send a message, and receive a reply](https://raw.githubusercontent.com/dpaluy/pi-session-control/master/session-control-preview.png)

## Install

Requires Pi, Git, and macOS or Linux. Tested with Pi 1.3.0.

```sh
pi install git:github.com/dpaluy/pi-session-control
```

## Set up

Start each participating session with control enabled and a unique name:

```sh
pi --session-control --name coordinator
```

In another terminal:

```sh
pi --session-control --name worker
```

No configuration file is needed. Sessions without `--session-control` do not expose control sockets or messaging tools.

## Use

- Run `/control-sessions` to see available sessions.
- Ask Pi: **“Send worker a message asking which files it changed, and ask it to reply to this session.”**
- Ask Pi: **“Get worker’s latest assistant message.”**
- Ask Pi: **“Summarize worker’s recent activity.”**

Pi uses `list_sessions` for discovery and `send_to_session` to send messages or retrieve output. Messages include sender information so the recipient can reply.

Messages default to steering the recipient. Request `follow_up` delivery to queue a message after its current task. Optional `message_processed` waiting confirms queueing, not execution; `turn_end` waits for the next turn, not necessarily the entire task. Do not combine turn-end waiting with a request for a separate reply.

### Send from a script

```sh
pi -p --session-control \
  --control-session worker \
  --send-session-message "Background task finished" \
  --send-session-mode follow_up \
  --send-session-wait message_processed
```

Child processes can use `$PI_SESSION_ID` to address their parent session. Startup messages omit sender information by default because the sending process may exit immediately.

## Check for updates

```sh
pi update --extensions
```

Restart participating sessions with `--session-control` after updating. See [CHANGELOG.md](CHANGELOG.md) for changes.

## Privacy

Control sockets are local and restricted to your OS user. Other processes running as that user can read session output, inject prompts, or abort work without an approval dialog. Enable this only for trusted local workflows; never expose the sockets over a network.

Messages can trigger tool execution and model calls. Summaries send recent session text to a configured model provider; that text may contain secrets, and provider charges or subscription limits can apply.

This extension does not launch sessions. Remote rewind is unsupported; use `/tree` in the target session.

## Reference

Based on Armin Ronacher’s [`control.ts` in mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff/blob/main/extensions/control.ts), adapted for Pi 1.3.0 with private socket permissions and connection cleanup.

## License

[Apache-2.0](LICENSE)

Supported by [Majestic Labs](https://majesticlabs.dev/).
