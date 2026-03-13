import { TemplateDefinition } from '../types';

class TemplateRegistry {
  private templates = new Map<string, TemplateDefinition>();

  register(template: TemplateDefinition): void {
    if (this.templates.has(template.meta.id)) {
      console.warn(
        `Template "${template.meta.id}" is already registered. Overwriting.`
      );
    }
    this.templates.set(template.meta.id, template);
  }

  get(id: string): TemplateDefinition | undefined {
    return this.templates.get(id);
  }

  list() {
    return Array.from(this.templates.values()).map((t) => ({
      ...t.meta,
      defaultProps: t.defaultProps,
    }));
  }

  getAll(): TemplateDefinition[] {
    return Array.from(this.templates.values());
  }

  has(id: string): boolean {
    return this.templates.has(id);
  }

  ids(): string[] {
    return Array.from(this.templates.keys());
  }

  count(): number {
    return this.templates.size;
  }
}

export const registry = new TemplateRegistry();
