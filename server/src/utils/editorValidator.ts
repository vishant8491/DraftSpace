/**
 * Tiptap / ProseMirror Document Schema Validator
 * Enforces valid document structure, supported node types, marks, and size limits.
 */

const ALLOWED_NODE_TYPES = new Set([
  'doc',
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'codeBlock',
  'horizontalRule',
  'text',
]);

const ALLOWED_MARK_TYPES = new Set([
  'bold',
  'italic',
  'underline',
  'code',
]);

export const MAX_RAW_FILE_SIZE = 1024 * 1024; // 1,048,576 bytes (1 MiB raw file limit)
export const MAX_EDITOR_CONTENT_LENGTH = 20 * 1024 * 1024; // 20,971,520 bytes (20 MiB serialized editor JSON limit to accommodate AST overhead and escaping)

export interface ValidationResult {
  valid: boolean;
  error?: string;
  parsedContent?: any;
  jsonString?: string;
}

export function validateEditorContent(input: unknown): ValidationResult {
  if (input === undefined || input === null) {
    return {
      valid: false,
      error: 'Content is required.',
    };
  }

  let doc: any = input;

  if (typeof input === 'string') {
    if (input.length > MAX_EDITOR_CONTENT_LENGTH) {
      return {
        valid: false,
        error: `Content exceeds maximum allowed size (${MAX_EDITOR_CONTENT_LENGTH} characters).`,
      };
    }
    try {
      doc = JSON.parse(input);
    } catch {
      return {
        valid: false,
        error: 'Content is not valid JSON.',
      };
    }
  }

  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
    return {
      valid: false,
      error: 'Document content root must be a JSON object.',
    };
  }

  if (doc.type !== 'doc') {
    return {
      valid: false,
      error: `Root node must have type "doc", got "${doc.type}".`,
    };
  }

  // Recursively validate nodes
  const nodeError = validateNode(doc, 0);
  if (nodeError) {
    return {
      valid: false,
      error: nodeError,
    };
  }

  const jsonString = JSON.stringify(doc);
  if (jsonString.length > MAX_EDITOR_CONTENT_LENGTH) {
    return {
      valid: false,
      error: `Serialized content exceeds maximum allowed limit (${MAX_EDITOR_CONTENT_LENGTH} characters).`,
    };
  }

  return {
    valid: true,
    parsedContent: doc,
    jsonString,
  };
}

function validateNode(node: any, depth: number): string | null {
  if (depth > 50) {
    return 'Document nesting exceeds maximum allowed depth of 50.';
  }

  if (typeof node !== 'object' || node === null) {
    return 'Malformed node: node must be an object.';
  }

  if (typeof node.type !== 'string' || !ALLOWED_NODE_TYPES.has(node.type)) {
    return `Unsupported editor node type: "${node.type}".`;
  }

  // Heading validation
  if (node.type === 'heading') {
    const level = node.attrs?.level;
    if (typeof level !== 'number' || level < 1 || level > 3) {
      return `Invalid heading level: ${level}. Supported levels are 1, 2, and 3.`;
    }
  }

  // Text node validation
  if (node.type === 'text') {
    if (typeof node.text !== 'string') {
      return 'Text node must contain a string "text" property.';
    }
    if (node.marks && Array.isArray(node.marks)) {
      for (const mark of node.marks) {
        if (!mark || typeof mark.type !== 'string' || !ALLOWED_MARK_TYPES.has(mark.type)) {
          return `Unsupported mark type: "${mark?.type}".`;
        }
      }
    }
    return null;
  }

  // Validate children
  if (node.content) {
    if (!Array.isArray(node.content)) {
      return `Node "${node.type}" content must be an array.`;
    }
    for (const child of node.content) {
      const err = validateNode(child, depth + 1);
      if (err) return err;
    }
  }

  return null;
}

/**
 * Convert plain text lines into a standard Tiptap ProseMirror JSON document.
 * Treats content strictly as text; never interprets HTML tags, scripts, or markdown.
 * Handles optional UTF-8 BOM, normalizes newlines, and preserves empty paragraphs.
 */
export function convertTextToEditorJson(rawText: string): any {
  // Strip optional UTF-8 BOM if present
  let text = rawText;
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  // Normalize Windows CRLF and classic Mac CR to standard LF
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const contentNodes: any[] = [];

  for (const line of lines) {
    if (line.length === 0) {
      // Empty line -> empty paragraph
      contentNodes.push({ type: 'paragraph' });
    } else {
      // Line with text -> paragraph with a single text node (verbatim text)
      contentNodes.push({
        type: 'paragraph',
        content: [{ type: 'text', text: line }],
      });
    }
  }

  if (contentNodes.length === 0) {
    contentNodes.push({ type: 'paragraph' });
  }

  return {
    type: 'doc',
    content: contentNodes,
  };
}

