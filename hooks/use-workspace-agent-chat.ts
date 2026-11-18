
"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";

import type { Editor } from "tldraw";
import type { BlockNoteEditor } from "@blocknote/core";

import {
  agentToolDefs,
  docToolDefs,
  fail,
  type ToolResult,
} from "@/lib/agent-tools";

import {
  PROMPT_LIMIT_ERROR,
  UPGRADE_REASONS,
} from "@/lib/plan-limits";

import {
  executeCanvasTool,
  summarizeCanvas,
  type ShapeIdMap,
} from "@/lib/agent-canvas";

import {
  executeDocTool,
  summarizeDoc,
} from "@/lib/agent-doc";

import { refreshPromptUsage } from "@/components/PlanButton";
import { useUpgradeDialog } from "@/components/UpgradeDialog";

type Editors = {
  canvasEditor: Editor | null;
  docEditor: BlockNoteEditor | null;
};

function runTool(
  editors: Editors,
  idMap: ShapeIdMap,
  toolName: string,
  input: unknown
): ToolResult {
  try {
    if (toolName in docToolDefs) {
      if (!editors.docEditor) {
        return fail(
          "The document is not open. Ask the user to switch to Both or Document view."
        );
      }

      return executeDocTool(
        editors.docEditor,
        toolName,
        input
      );
    }

    if (!editors.canvasEditor) {
      return fail(
        "The canvas is not open. Ask the user to switch to Both or Canvas view."
      );
    }

    return executeCanvasTool(
      editors.canvasEditor,
      idMap,
      toolName,
      input
    );
  } catch (error) {
    console.error("Workspace tool execution error:", {
      toolName,
      error,
    });

    return fail(
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while executing the tool."
    );
  }
}

export function useWorkspaceAgentChat(
  workspaceId: string,
  editors: Editors
) {
  const idMap = useRef<ShapeIdMap>(new Map());

  const openUpgrade = useUpgradeDialog();

  const editorsRef = useRef(editors);

  useEffect(() => {
    editorsRef.current = editors;
  }, [editors]);

  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/agent",

        body: () => {
          const {
            canvasEditor,
            docEditor,
          } = editorsRef.current;

          return {
            workspaceId,

            canvasContext: canvasEditor
              ? summarizeCanvas(canvasEditor)
              : null,

            docContext: docEditor
              ? summarizeDoc(docEditor)
              : null,
          };
        },
      })
  );

  const chat = useChat({
    transport,

    sendAutomaticallyWhen:
      lastAssistantMessageIsCompleteWithToolCalls,

    onFinish: () => {
      refreshPromptUsage();
    },

    onError: (error) => {
      console.error("Agent chat error:", error);

      if (
        error.message.includes(PROMPT_LIMIT_ERROR)
      ) {
        refreshPromptUsage();
        openUpgrade(UPGRADE_REASONS.prompts);
      }
    },

    onToolCall: ({ toolCall }) => {
      const output = runTool(
        editorsRef.current,
        idMap.current,
        toolCall.toolName,
        toolCall.input
      );

      chat.addToolOutput({
        tool: toolCall.toolName as keyof typeof agentToolDefs,
        toolCallId: toolCall.toolCallId,
        output,
      });
    },
  });

  return chat;
}

export type WorkspaceAgentChat =
  ReturnType<typeof useWorkspaceAgentChat>;
