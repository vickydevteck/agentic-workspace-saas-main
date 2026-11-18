
import { z } from "zod";

// Shared schemas for all workspace agent tools.

const point = z.object({
  x: z.number(),
  y: z.number(),
});

const shapeId = (example: string) =>
  z.string().describe(`Caller-assigned unique id, e.g. '${example}'`);

const boxShape = (example: string) =>
  z.object({
    id: shapeId(example),
    position: point,
    width: z.number(),
    height: z.number(),
    label: z.string().optional(),
  });

export const canvasToolDefs = {
  createRectangle: {
    description:
      "Create a rectangle on the canvas. Use for process steps, components and containers.",
    inputSchema: boxShape("rect-1"),
  },

  createEllipse: {
    description:
      "Create an ellipse on the canvas. Use for start/end nodes and circular elements.",
    inputSchema: boxShape("ellipse-1"),
  },

  createText: {
    description:
      "Create a text label or title on the canvas.",
    inputSchema: z.object({
      id: shapeId("text-1"),
      position: point,
      text: z.string(),
      fontSize: z.number().optional(),
    }),
  },

  createArrow: {
    description:
      "Create an arrow connecting two existing shapes by their IDs.",
    inputSchema: z.object({
      id: shapeId("arrow-1"),
      fromShapeId: z.string(),
      toShapeId: z.string(),
      label: z.string().optional(),
    }),
  },

  updateShape: {
    description:
      "Update an existing shape's position, dimensions or label.",
    inputSchema: z.object({
      id: z.string(),
      position: point.optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      label: z.string().optional(),
    }),
  },

  deleteShape: {
    description: "Delete an existing canvas shape.",
    inputSchema: z.object({
      id: z.string(),
    }),
  },

  createEntityTable: {
    description:
      "Create a database entity table with typed columns. Use for ER diagrams.",
    inputSchema: z.object({
      id: shapeId("table-users"),
      position: point,
      tableName: z.string(),
      columns: z.array(
        z.object({
          name: z.string(),
          dataType: z.string().describe(
            "Example: uuid, text, timestamptz, int"
          ),
          isPK: z.boolean().default(false),
          isFK: z.boolean().default(false),
        })
      ),
    }),
  },

  addColumn: {
    description: "Add a column to an existing entity table.",
    inputSchema: z.object({
      tableId: z.string(),
      name: z.string(),
      dataType: z.string(),
      isPK: z.boolean().default(false),
      isFK: z.boolean().default(false),
    }),
  },

  updateColumn: {
    description: "Update an existing entity table column.",
    inputSchema: z.object({
      tableId: z.string(),
      columnName: z.string(),
      name: z.string().optional(),
      dataType: z.string().optional(),
      isPK: z.boolean().optional(),
      isFK: z.boolean().optional(),
    }),
  },

  removeColumn: {
    description: "Remove a column from an entity table.",
    inputSchema: z.object({
      tableId: z.string(),
      columnName: z.string(),
    }),
  },

  connectRelationship: {
    description:
      "Connect a primary-key column to its matching foreign-key column in another entity table.",
    inputSchema: z.object({
      id: shapeId("rel-1"),
      fromTableId: z.string(),
      fromColumnName: z.string(),
      toTableId: z.string(),
      toColumnName: z.string(),
    }),
  },
};

const markdown = z.string().describe(
  "Content as Markdown: headings, lists, checklists, tables, code, bold and links."
);

export const docToolDefs = {
  insertDocContent: {
    description:
      "Insert Markdown content at the end of the document or after a specified block.",
    inputSchema: z.object({
      markdown,
      afterBlockId: z.string().optional(),
    }),
  },

  updateDocBlock: {
    description:
      "Rewrite a specific existing document block with Markdown content.",
    inputSchema: z.object({
      blockId: z.string(),
      markdown,
    }),
  },

  deleteDocBlocks: {
    description:
      "Delete specified document blocks when the user requests deletion.",
    inputSchema: z.object({
      blockIds: z.array(z.string()).min(1),
    }),
  },

  replaceDoc: {
    description:
      "Replace the complete document. Only use for a full rewrite or a new document.",
    inputSchema: z.object({
      markdown,
    }),
  },
};

export const agentToolDefs = {
  ...canvasToolDefs,
  ...docToolDefs,
};

export type ToolResult =
  | { success: true }
  | { success: false; error: string };

export const ok = (): ToolResult => ({
  success: true,
});

export const fail = (error: string): ToolResult => ({
  success: false,
  error,
});

// Normalize escaped newlines returned by Gemini.
export function normalizeModelText(text: string) {
  return text.includes("\n")
    ? text
    : text.replace(/\\n/g, "\n");
}
