import { Router } from 'express';
import { z } from 'zod';
import { registry } from '../../core/registry';
import { getAllThemes } from '../../themes';

const router = Router();

/**
 * Extract schema field metadata from a Zod schema.
 * This creates the field info the frontend needs to generate forms.
 */
function extractSchemaFields(schema: z.ZodType<any>): any[] {
  const fields: any[] = [];

  // Unwrap ZodObject
  const shape = getShape(schema);
  if (!shape) return fields;

  for (const [name, fieldSchema] of Object.entries(shape)) {
    fields.push(extractField(name, fieldSchema as z.ZodType<any>));
  }

  return fields;
}

function extractField(name: string, schema: z.ZodType<any>): any {
  const unwrapped = unwrapSchema(schema);
  const def = (unwrapped as any)?._def;

  const field: any = {
    name,
    label: formatLabel(name),
    required: !isOptional(schema),
    default: getDefault(schema),
  };

  if (def?.typeName === 'ZodString') {
    // Check if it looks like a color field
    if (name.toLowerCase().includes('color') || name.toLowerCase().includes('colour')) {
      field.type = 'color';
    } else if (name.toLowerCase().includes('url') || name.toLowerCase().includes('image') || name.toLowerCase().includes('logo')) {
      field.type = 'url';
    } else {
      field.type = 'string';
    }
  } else if (def?.typeName === 'ZodNumber') {
    field.type = 'number';
    if (def.checks) {
      for (const check of def.checks) {
        if (check.kind === 'min') field.min = check.value;
        if (check.kind === 'max') field.max = check.value;
      }
    }
  } else if (def?.typeName === 'ZodBoolean') {
    field.type = 'boolean';
  } else if (def?.typeName === 'ZodEnum') {
    field.type = 'string';
    field.options = def.values;
  } else if (def?.typeName === 'ZodArray') {
    field.type = 'array';
    const innerType = def.type;
    const innerUnwrapped = unwrapSchema(innerType);
    const innerDef = (innerUnwrapped as any)?._def;

    if (innerDef?.typeName === 'ZodObject') {
      // Array of objects
      field.items = {
        type: 'object',
        fields: extractSchemaFields(innerType),
      };
    } else if (innerDef?.typeName === 'ZodString') {
      // Check if it's a color array
      if (name.toLowerCase().includes('color')) {
        field.items = { type: 'color' };
      } else {
        field.items = { type: 'string' };
      }
    } else if (innerDef?.typeName === 'ZodNumber') {
      field.items = { type: 'number' };
    } else {
      field.items = { type: 'string' };
    }
  } else if (def?.typeName === 'ZodObject') {
    field.type = 'object';
    field.fields = extractSchemaFields(unwrapped);
  } else if (def?.typeName === 'ZodUnion' || def?.typeName === 'ZodDiscriminatedUnion') {
    // Union type - try to determine from name
    if (name.toLowerCase().includes('color')) {
      field.type = 'color';
    } else {
      field.type = 'string';
    }
  } else {
    field.type = 'string';
  }

  return field;
}

function unwrapSchema(schema: z.ZodType<any>): z.ZodType<any> {
  const def = (schema as any)?._def;
  if (!def) return schema;

  if (def.typeName === 'ZodDefault') return unwrapSchema(def.innerType);
  if (def.typeName === 'ZodOptional') return unwrapSchema(def.innerType);
  if (def.typeName === 'ZodNullable') return unwrapSchema(def.innerType);
  if (def.typeName === 'ZodEffects') return unwrapSchema(def.schema);

  return schema;
}

function getShape(schema: z.ZodType<any>): Record<string, z.ZodType<any>> | null {
  const unwrapped = unwrapSchema(schema);
  const def = (unwrapped as any)?._def;
  if (def?.typeName === 'ZodObject') {
    return def.shape();
  }
  return null;
}

function isOptional(schema: z.ZodType<any>): boolean {
  const def = (schema as any)?._def;
  if (!def) return false;
  if (def.typeName === 'ZodOptional') return true;
  if (def.typeName === 'ZodDefault') return true; // has default, so effectively optional
  return false;
}

function getDefault(schema: z.ZodType<any>): any {
  const def = (schema as any)?._def;
  if (!def) return undefined;
  if (def.typeName === 'ZodDefault') {
    return typeof def.defaultValue === 'function' ? def.defaultValue() : def.defaultValue;
  }
  if (def.typeName === 'ZodOptional') return getDefault(def.innerType);
  return undefined;
}

function formatLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

/**
 * GET /api/templates — List all registered templates with schema info
 */
router.get('/api/templates', (_req, res) => {
  const templates = registry.getAll().map((t) => ({
    ...t.meta,
    defaultProps: t.defaultProps,
    schema: extractSchemaFields(t.schema),
  }));

  res.json({
    count: templates.length,
    templates,
  });
});

/**
 * GET /api/templates/:id — Get a single template by id with full schema
 */
router.get('/api/templates/:id', (req, res) => {
  const { id } = req.params;
  const template = registry.get(id);

  if (!template) {
    res.status(404).json({
      error: 'Template not found',
      message: `No template with id "${id}". Available: ${registry.ids().join(', ')}`,
    });
    return;
  }

  res.json({
    ...template.meta,
    defaultProps: template.defaultProps,
    schema: extractSchemaFields(template.schema),
  });
});

/**
 * GET /api/themes — List all themes
 */
router.get('/api/themes', (_req, res) => {
  const allThemes = getAllThemes();
  res.json({
    count: allThemes.length,
    themes: allThemes,
  });
});

export default router;
