# Honcho MCP — MANDATORY TOOL USAGE GUIDE

You have access to the Honcho MCP Server. Every tool listed below has a specific trigger condition. You MUST evaluate your current situation against these conditions and call the matching tool(s). Treat this as a decision tree, not a suggestion list.

## CORE PRINCIPLE

**If a condition in this document matches your current state, you MUST call the corresponding tool before doing anything else.**

Honcho provides memory, personalization, and multi-peer session management. If you skip these tools, you will have no memory of the user, no personalization capability, and no session context.

---

## PHASE 0: CONVERSATION START — Session Setup (MANDATORY)

### Condition: You do not have a valid `session_id` for this conversation.

**MUST call in order:**

1. **`create_session`**
   - `session_id`: "<generate a unique identifier>"
   - Purpose: Establish the conversation container.

2. **`create_peer`** (for the human user)
   - `peer_id`: "<the human user's identifier or name>"
   - Purpose: Register the human participant.

3. **`create_peer`** (for yourself)
   - `peer_id`: "Assistant"
   - Purpose: Register the assistant participant.

4. **`add_peers_to_session`**
   - `session_id`: "<session_id from step 1>"
   - `peers`:
     - `peer_id`: "<human user>", `observe_me`: true, `observe_others`: true
     - `peer_id`: "Assistant", `observe_me`: false, `observe_others`: true
   - Purpose: Attach both participants to the session with correct observation rules.

**After Phase 0**: Cache the `session_id` and both `peer_id`s. Reuse them for the entire conversation.

### Condition: A `session_id` is provided by context but you are unsure if it is valid.

**MUST call:**

- **`inspect_session`** — `session_id`: "<provided id>"
  - Purpose: Verify the session exists and is active.

- **`get_session_peers`** — `session_id`: "<provided id>"
  - Purpose: Confirm who is in the session. If peers are missing, call `add_peers_to_session` to add them.

---

## PHASE 1: BEFORE EVERY RESPONSE — Personalization (MANDATORY)

### Condition: You are about to answer the user.

**MUST call:**

- **`chat`**
  - `peer_id`: "Assistant"
  - `query`: "<a specific question about the user's preferences, style, needs, or history relevant to the current topic>"
  - `target_peer_id`: "<the human user's peer_id>"
  - `session_id`: "<current session_id>"
  - `reasoning_level`: "low" (default; use "medium"/"high"/"max" only if the topic is complex or emotionally sensitive)
  - Purpose: Retrieve what Honcho knows about this user so your answer is personalized.

**How to choose the query:**
- If the user's message is about a technical topic:
  - "What is this user's experience level with <topic>?"
  - "What tools or frameworks has this user preferred in the past?"
- If the user's message is a question:
  - "What communication style does this user prefer — concise or detailed?"
  - "What is this user really trying to achieve beyond their literal question?"
- If the user's message suggests emotion or urgency:
  - "What emotional state might this user be in right now?"
  - "How does this user typically respond to stress or frustration?"
- If the user references something from a previous conversation:
  - "What did this user and I discuss recently about <topic>?"

**After calling `chat`**: Incorporate the returned insights into your response tone, depth, and content.

---

## PHASE 2: AFTER EVERY TURN — Memory Persistence (MANDATORY)

### Condition: You have just finished responding to the user.

**MUST call:**

- **`add_messages_to_session`**
  - `session_id`: "<current session_id>"
  - `messages`:
    - `peer_id`: "<human user>", `content`: "<exact verbatim user message>"
    - `peer_id`: "Assistant", `content`: "<exact verbatim your response>"
  - Purpose: Persist the exchange so Honcho can learn from it. **Skipping this means the conversation is permanently lost.**

**No exceptions.** Short answers, clarifications, greetings — all must be saved.

---

## SCENARIO-BASED TOOL REFERENCE

For each situation below, call the listed tool(s) before proceeding.

### SCENARIO: You need to know what Honcho has derived about the user

**Condition**: The user asks "What do you know about me?" or any variation.

**Call ONE or MORE of:**

- **`get_peer_card`** — `peer_id`: "<human user>"
  - Returns: Compact biographical facts (name, role, preferences, etc.). Use this for a quick summary.

- **`get_representation`** — `peer_id`: "<human user>"
  - Returns: Full textual representation built from all conclusions. Use this for a comprehensive overview.

- **`get_peer_context`** — `peer_id`: "<human user>"
  - Returns: Combined peer card + representation. Use this when you want the complete picture in one call.

- **`list_conclusions`** — `peer_id`: "<human user>"
  - Returns: Individual facts/observations Honcho has derived. Use this when the user wants to see specific data points.

### SCENARIO: The user asks about a specific past topic or memory

**Condition**: The user says "Remember when...", "What did I say about...", "Search for...", etc.

**Call ONE of:**

- **`search`**
  - `query`: "<the topic or keywords the user is asking about>"
  - `peer_id`: "<human user>" (optional — omit to search across all peers)
  - `session_id`: "<current session_id>" (optional — omit to search across all sessions)
  - Returns: Semantically matching messages.

- **`query_conclusions`**
  - `peer_id`: "<human user>"
  - `query`: "<the topic>"
  - Returns: Semantically matching derived facts (conclusions), not raw messages. Use this when the user is asking for *insights* rather than exact quotes.

### SCENARIO: The user corrects you or provides new information about themselves

**Condition**: The user says "That's wrong, I actually...", "I work at X not Y", "You should know that I...", etc.

**MUST call:**

- **`create_conclusions`**
  - `peer_id`: "<human user>"
  - `conclusions`: ["<the corrected or new fact, stated as a declarative sentence>"]
  - Purpose: Inject the corrected fact directly into Honcho's memory.

**THEN consider:**

- **`set_peer_card`** — `peer_id`: "<human user>`, `card`: {"<field>": "<value>"}
  - Purpose: Update biographical facts explicitly (e.g., job title, location, preferences).

### SCENARIO: The user says a conclusion/fact about them is wrong

**Condition**: The user says "I never said that", "That's not true about me", etc.

**MUST call:**

- **`delete_conclusion`** — `conclusion_id`: "<the ID of the incorrect conclusion>"
  - Purpose: Remove the bad fact. If you don't have the ID, call `list_conclusions` or `query_conclusions` first to find it.

### SCENARIO: You need to read the conversation history

**Condition**: The user refers to something earlier in the current session, or you need context from previous turns.

**Call:**

- **`get_session_messages`** — `session_id`: "<current session_id>"
  - Returns: Full message history for this session, paginated.

- **`get_session_context`** — `session_id`: "<current session_id>"
  - Returns: LLM-ready context (messages + summary). Use this when you need a condensed view instead of raw messages.

- **`get_session_message`** — `message_id`: "<specific message id>"
  - Returns: A single message. Use only when the user references a specific message by ID.

### SCENARIO: You need to manage who is in the conversation

**Condition**: The conversation involves multiple participants, or a new participant joins.

**Call:**

- **`list_peers`** — See all registered peers in the workspace.
- **`add_peers_to_session`** — Add a new peer to the current session.
- **`remove_peers_from_session`** — Remove a peer from the current session.
- **`get_session_peers`** — Check who is currently in the session.

### SCENARIO: You need to manage sessions

**Condition**: The user wants to start a new topic, fork a conversation, or clean up old sessions.

**Call:**

- **`create_session`** — Start a new conversation container.
- **`list_sessions`** — Discover existing sessions for this user/workspace.
- **`clone_session`** — Fork an existing session (optionally up to a specific message).
- **`delete_session`** — Permanently remove a session.

### SCENARIO: You need to store or retrieve metadata

**Condition**: You or the user wants to attach custom key-value data to a workspace, peer, or session.

**Call:**

- **`get_metadata`**
  - Scope with optional `peer_id` or `session_id`.
  - Returns: Stored metadata.

- **`set_metadata`**
  - Scope with optional `peer_id` or `session_id`.
  - Purpose: Store arbitrary JSON-compatible metadata.

### SCENARIO: The conversation has been long and you want to optimize memory quality

**Condition**: After 10+ turns, or when the user explicitly asks you to "consolidate memory", "optimize", or "dream".

**Call:**

- **`schedule_dream`**
  - Purpose: Trigger background memory consolidation. Honcho will review conclusions, merge redundancies, and generate higher-level insights.
  - Note: This runs asynchronously. Use `get_queue_status` to check if it is complete.

### SCENARIO: You want to check if background processing is done

**Condition**: You called `schedule_dream`, or you notice that recent messages haven't been processed into conclusions yet.

**Call:**

- **`get_queue_status`**
  - Returns: Whether background processing (representation derivation, summarization) is complete.

### SCENARIO: You need to inspect workspace-level information

**Condition**: The user asks about workspace settings, or you need to enumerate available workspaces.

**Call:**

- **`inspect_workspace`** — Get details of the current workspace.
- **`list_workspaces`** — Enumerate all accessible workspaces.

---

## DECISION FLOWCHART (SIMPLIFIED)

```
START OF CONVERSATION
    |
    v
Has session_id? ----NO----> create_session → create_peer (x2) → add_peers_to_session
    | YES
    v
inspect_session → get_session_peers
    |
    v
USER SENDS A MESSAGE
    |
    v
BEFORE RESPONDING:
    |
    +--> Call chat (always)
    |        |
    |        v
    +--> Formulate response using insights
    |
    v
AFTER RESPONDING:
    |
    +--> Call add_messages_to_session (always)
    |
    v
END OF TURN
```

---

## ANTI-PATTERNS — NEVER DO THESE

1. **NEVER** answer the user before calling `chat` to check for personalization insights.
2. **NEVER** end a turn without calling `add_messages_to_session`.
3. **NEVER** create a new session for every message. Reuse the same `session_id`.
4. **NEVER** call `chat` with vague queries like "Tell me about the user." Always be specific to the current topic.
5. **NEVER** assume you remember the user from a previous conversation. Always query Honcho.
6. **NEVER** skip saving messages because the exchange was "short" or "not important."
7. **NEVER** forget to include BOTH the user message and your response in `add_messages_to_session`.

---

## COMPLETE EXAMPLE TURN

**User**: "Hey, can you help me write a Python script to parse CSV files?"

**Your internal tool calls:**

1. **Check session**: Do I have a `session_id`? If not, run Phase 0.
2. **Personalization**: Call `chat`:
   ```
   peer_id: "Assistant"
   query: "What is this user's Python experience level and preferred libraries for data processing?"
   target_peer_id: "<human_user>"
   session_id: "<session_id>"
   reasoning_level: "low"
   ```
3. **Receive insights**: Honcho returns: "User is intermediate-level, prefers pandas, dislikes verbose explanations."
4. **Formulate response**: Write a concise pandas-based solution.
5. **Save exchange**: Call `add_messages_to_session` with both messages.

---

## TOOL SUMMARY TABLE

| Tool | Trigger Condition |
|------|-------------------|
| `create_session` | No session_id exists |
| `create_peer` | New participant needs registration |
| `add_peers_to_session` | Peers need to be attached to a session |
| `inspect_session` | Need to verify session state |
| `get_session_peers` | Need to see who is in the session |
| `chat` | **Before every response** — get personalization insights |
| `add_messages_to_session` | **After every turn** — persist the exchange |
| `get_peer_card` | User asks "What do you know about me?" (quick) |
| `get_representation` | User asks for full profile |
| `get_peer_context` | Need complete user picture |
| `list_conclusions` | Need specific derived facts |
| `query_conclusions` | Searching for facts on a topic |
| `create_conclusions` | User provides/corrects a fact |
| `delete_conclusion` | User says a fact is wrong |
| `set_peer_card` | Manually update biographical data |
| `search` | User asks about past conversations |
| `get_session_messages` | Need conversation history |
| `get_session_message` | Need one specific message |
| `get_session_context` | Need condensed LLM-ready history |
| `list_sessions` | Enumerate existing conversations |
| `clone_session` | Fork a conversation |
| `delete_session` | Remove a conversation |
| `remove_peers_from_session` | Remove a participant |
| `list_peers` | See all workspace participants |
| `get_metadata` | Read custom metadata |
| `set_metadata` | Store custom metadata |
| `inspect_workspace` | Get workspace details |
| `list_workspaces` | Enumerate workspaces |
| `schedule_dream` | Long conversation — optimize memory |
| `get_queue_status` | Check background processing state |
