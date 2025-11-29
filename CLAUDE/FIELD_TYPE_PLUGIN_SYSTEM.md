<!-- v1.0.0 -->

# Reactium Field Type Plugin System

**Complete plugin architecture for extending Content Type Editor with custom field types in Reactium Admin.**

---

## Architecture Overview

The Field Type Plugin System enables developers to create custom field types for the Reactium Admin Content Type Editor. Each field type provides:

- **Type Definition** - Metadata (label, icon, tooltip, order)
- **Configuration Component** - UI for field settings in Content Type Editor
- **Editor Component** - UI for editing field value in Content Editor
- **Settings Schema** - Configuration options for the field type

**Key Components:**

- **`ContentType.FieldType` Registry** - Stores field type definitions
- **`Content.Editor` Registry** - Stores content editor field components
- **`Component` Registry** - Stores configuration UI components
- **Three-Phase Registration** - Type metadata → Config UI → Editor UI

---

## Registration Pattern

### Complete Registration Example

```javascript
import Reactium, { __ } from '@atomic-reactor/reactium-core/sdk';
import { Icon } from 'reactium-ui';
import { Editor, FieldType } from '.';

const ID = 'Text';

// 1. Field Type Definition
const fieldType = {
    label: __('Text Field'),
    icon: Icon.Feather.Type,
    tooltip: __('Adds a text field to your content type.'),
    component: 'FieldTypeText',
    order: Reactium.Enums.priority.neutral - 1,
};

// 2. Three-Phase Registration
(() => {
    Reactium.Plugin.register(`CTE-${ID}`).then(() => {
        // Phase 1: Register field type metadata
        Reactium.ContentType.FieldType.register(ID, fieldType);

        // Phase 2: Register configuration component
        Reactium.Component.register(fieldType.component, FieldType);

        // Phase 3: Register editor component
        Reactium.Content.Editor.register(ID, { component: Editor });
    });
})();
```

**Source**: `reactium-admin-core/Content/TypeEditor/Plugins/FieldTypeText/reactium-hooks.js:1-25`

---

## Field Type Definition Object

### Required Properties

```javascript
{
    label: String,        // Display name in field type picker
    icon: Component,      // React component for icon
    tooltip: String,      // Description shown on hover
    component: String,    // ID of configuration component
    order: Number,        // Sort order in field type picker
}
```

### Property Details

| Property | Type | Description |
|----------|------|-------------|
| `label` | String | Internationalized display name (use `__()` wrapper) |
| `icon` | Component | Icon component (typically from `Icon.Feather.*` or custom) |
| `tooltip` | String | Help text shown in field type picker |
| `component` | String | Registered component ID for configuration UI |
| `order` | Number | Sort order (use `Reactium.Enums.priority.*` values) |

**Real-World Values:**

```javascript
// Text Field
{
    label: __('Text Field'),
    icon: Icon.Feather.Type,
    tooltip: __('Adds a text field to your content type.'),
    component: 'FieldTypeText',
    order: Reactium.Enums.priority.neutral - 1,
}

// Boolean Field
{
    label: __('Boolean'),
    icon: Icon.Feather.ToggleLeft,
    tooltip: __('Adds a boolean field to your content type.'),
    component: 'FieldTypeBoolean',
    order: Reactium.Enums.priority.neutral + 1,
}

// Date Field
{
    label: __('Date'),
    icon: Icon.Feather.Calendar,
    tooltip: __('Adds a date field to your content type.'),
    component: 'FieldTypeDate',
    order: Reactium.Enums.priority.neutral + 2,
}
```

---

## Configuration Component (FieldType)

### Component Contract

The configuration component renders **field settings UI** in the Content Type Editor.

**Props Received:**

```javascript
{
    DragHandle: Component,  // Drag handle for field reordering
    // ... other Content Type Editor context props
}
```

**Settings Collection:**

Form inputs with `name` attributes become field settings:

```javascript
// Input name becomes setting key
<input name="placeholder" />           → settings.placeholder
<input name="defaultValue" />          → settings.defaultValue
<input name="min" />                   → settings.min
<Checkbox name="multiline" />          → settings.multiline
```

### Example: Text Field Configuration

```javascript
import op from 'object-path';
import { Checkbox } from 'reactium-ui';
import React from 'react';
import { __, useHookComponent } from '@atomic-reactor/reactium-core/sdk';

export const FieldType = (props) => {
    const { DragHandle } = props;
    const FieldTypeDialog = useHookComponent('FieldTypeDialog', DragHandle);

    return (
        <FieldTypeDialog {...props}>
            <div className='field-type-text'>
                <div className='input-group'>
                    <label>
                        <span className='sr-only'>{__('Default Value')}</span>
                        <input
                            type='text'
                            name='defaultValue'
                            placeholder={__('Default Value')}
                        />
                    </label>
                </div>
                <div className='input-group'>
                    <label>
                        <span className='sr-only'>{__('Placeholder')}</span>
                        <input
                            type='text'
                            name='placeholder'
                            placeholder={__('Placeholder')}
                        />
                    </label>
                </div>
                <div className='input-group'>
                    <label>
                        <span className='sr-only'>{__('Pattern')}</span>
                        <input
                            type='text'
                            name='pattern'
                            placeholder={__('Pattern')}
                        />
                    </label>
                </div>
                <div className='input-group'>
                    <label>
                        <span className='sr-only'>{__('Min Characters')}</span>
                        <input
                            type='number'
                            name='min'
                            placeholder={__('Min Characters')}
                        />
                    </label>
                    <label>
                        <span className='sr-only'>{__('Max Characters')}</span>
                        <input
                            type='number'
                            name='max'
                            placeholder={__('Max Characters')}
                        />
                    </label>
                    <label>
                        <span className='sr-only'>{__('Rows')}</span>
                        <input
                            type='number'
                            name='rows'
                            placeholder={__('Rows')}
                        />
                    </label>
                    <div className='checks'>
                        <Checkbox
                            name='multiline'
                            label={__('Multiline')}
                            labelAlign='right'
                            value={true}
                        />
                        <Checkbox
                            name='required'
                            label={__('Required')}
                            labelAlign='right'
                            value={true}
                        />
                    </div>
                </div>
            </div>
        </FieldTypeDialog>
    );
};
```

**Source**: `reactium-admin-core/Content/TypeEditor/Plugins/FieldTypeText/index.js:1-90`

**FieldTypeDialog Component:**

Wrapper component providing:
- Drag handle integration
- Field name/label UI
- Delete button
- Collapse/expand behavior
- Consistent styling

---

## Editor Component

### Component Contract

The editor component renders **field value editing UI** in the Content Editor.

**Props Received:**

```javascript
{
    fieldName: String,      // Field name from content type definition
    fieldId: String,        // Field UUID
    fieldType: String,      // Field type ID
    settings: Object,       // Settings from configuration component
    value: Any,             // Current field value
    onChange: Function,     // (value) => void - Update field value
    // ... other Content Editor context props
}
```

### Example: Simple Editor

```javascript
import React from 'react';
import op from 'object-path';

export const Editor = (props) => {
    const { fieldName, settings, value, onChange } = props;

    const placeholder = op.get(settings, 'placeholder');
    const defaultValue = op.get(settings, 'defaultValue');
    const min = op.get(settings, 'min');
    const max = op.get(settings, 'max');
    const pattern = op.get(settings, 'pattern');
    const multiline = op.get(settings, 'multiline', false);
    const rows = op.get(settings, 'rows', 1);

    const inputProps = {
        name: fieldName,
        value: value || defaultValue || '',
        onChange: (e) => onChange(e.target.value),
        placeholder,
        pattern,
    };

    if (min) inputProps.minLength = min;
    if (max) inputProps.maxLength = max;

    if (multiline) {
        return <textarea {...inputProps} rows={rows} />;
    }

    return <input type='text' {...inputProps} />;
};
```

---

## Built-In Field Types

### Complete List (20+ Types)

| Field Type | Icon | Description | Settings |
|------------|------|-------------|----------|
| **Text** | Type | Single/multi-line text | placeholder, default, min/max, pattern, rows, multiline, required |
| **Number** | Hash | Numeric input | placeholder, default, min/max, step, required |
| **Boolean** | ToggleLeft | Checkbox | label, default |
| **Date** | Calendar | Date/time picker | default, min/max, format, showTime |
| **Select** | List | Dropdown select | options, multiple, default |
| **Array** | List | Array editor | itemType, min/max items |
| **Object** | Braces | JSON object editor | schema, default |
| **Pointer** | Link | Parse Object reference | targetClass, displayField |
| **File** | File | Media library integration | accept, multiple, maxSize |
| **URL** | Link2 | URL input with validation | placeholder, required |
| **RichText** | Edit3 | WYSIWYG editor | toolbar, plugins |
| **Taxonomy** | Tag | Taxonomy selector | taxonomyType, multiple |
| **Publisher** | Users | Publishing workflow | statuses, roles |
| **Status** | Circle | Content status | statuses |
| **Title** | Type | Title field (special) | placeholder, required |

**Source**: `reactium-admin-core/Content/TypeEditor/Plugins/FieldType*/reactium-hooks.js`

---

## Content Type Field Configuration

### Field Configuration Object

When a field is added to a content type, it's stored with this structure:

```javascript
{
    fieldId: String,        // UUID (auto-generated)
    fieldName: String,      // Field name (unique per content type)
    fieldType: String,      // Field type ID (e.g., 'Text', 'Number')
    region: String,         // Region ID (layout section)
    settings: Object,       // Settings from configuration component
}
```

### Example: Content Type with Fields

```javascript
{
    type: 'Article',
    machineName: 'article',
    fields: {
        'field-uuid-1': {
            fieldId: 'field-uuid-1',
            fieldName: 'title',
            fieldType: 'Text',
            region: 'default',
            settings: {
                placeholder: 'Enter article title',
                required: true,
                maxLength: 100,
            },
        },
        'field-uuid-2': {
            fieldId: 'field-uuid-2',
            fieldName: 'body',
            fieldType: 'RichText',
            region: 'default',
            settings: {
                toolbar: ['bold', 'italic', 'link'],
            },
        },
        'field-uuid-3': {
            fieldId: 'field-uuid-3',
            fieldName: 'publishDate',
            fieldType: 'Date',
            region: 'sidebar',
            settings: {
                showTime: true,
            },
        },
    },
    regions: {
        default: {
            id: 'default',
            label: 'Content',
            slug: 'content',
        },
        sidebar: {
            id: 'sidebar',
            label: 'Sidebar',
            slug: 'sidebar',
        },
    },
}
```

---

## SDK Reference

### ContentType.FieldType Registry

```javascript
// Register field type
Reactium.ContentType.FieldType.register(id, definition);

// Get field type definition
const fieldType = Reactium.ContentType.FieldType.get(id);

// List all field types
const allTypes = Reactium.ContentType.FieldType.list;

// Unregister field type
Reactium.ContentType.FieldType.unregister(id);
```

**Source**: `reactium-admin-core/Content/TypeEditor/sdk/index.js:141`

### Content.Editor Registry

```javascript
// Register editor component
Reactium.Content.Editor.register(id, { component: EditorComponent });

// Get editor component
const editor = Reactium.Content.Editor.get(id);

// List all editor components
const allEditors = Reactium.Content.Editor.list;

// Unregister editor component
Reactium.Content.Editor.unregister(id);
```

**Source**: `reactium-admin-core/Content/Editor/sdk.js:30-32`

---

## Real-World Pattern: Complex Field Type

### Example: Media File Field

**Registration:**

```javascript
const ID = 'File';

const fieldType = {
    label: __('File'),
    icon: Icon.Feather.File,
    tooltip: __('Adds a file/media field to your content type.'),
    component: 'FieldTypeFile',
    order: Reactium.Enums.priority.neutral + 5,
};

Reactium.Plugin.register(`CTE-${ID}`).then(() => {
    Reactium.ContentType.FieldType.register(ID, fieldType);
    Reactium.Component.register(fieldType.component, FieldType);
    Reactium.Content.Editor.register(ID, { component: Editor });
});
```

**Configuration Component:**

```javascript
export const FieldType = (props) => {
    const { DragHandle } = props;
    const FieldTypeDialog = useHookComponent('FieldTypeDialog', DragHandle);

    return (
        <FieldTypeDialog {...props}>
            <div className='field-type-file'>
                <div className='input-group'>
                    <label>
                        <span>{__('Accept')}</span>
                        <input
                            type='text'
                            name='accept'
                            placeholder='image/*,video/*'
                        />
                    </label>
                </div>
                <div className='input-group'>
                    <Checkbox
                        name='multiple'
                        label={__('Allow Multiple')}
                        value={true}
                    />
                </div>
                <div className='input-group'>
                    <label>
                        <span>{__('Max File Size (MB)')}</span>
                        <input
                            type='number'
                            name='maxSize'
                            placeholder='10'
                        />
                    </label>
                </div>
            </div>
        </FieldTypeDialog>
    );
};
```

**Editor Component:**

```javascript
import Reactium from '@atomic-reactor/reactium-core/sdk';
import { MediaPicker } from 'reactium-ui';

export const Editor = (props) => {
    const { fieldName, settings, value, onChange } = props;

    const accept = op.get(settings, 'accept', 'image/*');
    const multiple = op.get(settings, 'multiple', false);
    const maxSize = op.get(settings, 'maxSize', 10) * 1024 * 1024; // Convert MB to bytes

    const handleSelect = (files) => {
        if (multiple) {
            onChange(files);
        } else {
            onChange(files[0]);
        }
    };

    return (
        <MediaPicker
            accept={accept}
            multiple={multiple}
            maxSize={maxSize}
            value={value}
            onChange={handleSelect}
        />
    );
};
```

---

## Best Practices

### 1. Field Type ID Convention

```javascript
// Good - Short, PascalCase ID
const ID = 'Text';
const ID = 'RichText';
const ID = 'Boolean';

// Bad - Verbose or inconsistent
const ID = 'text-field';
const ID = 'RICH_TEXT_EDITOR';
```

### 2. Internationalization

Always wrap user-facing strings with `__()`:

```javascript
// Good
{
    label: __('Text Field'),
    tooltip: __('Adds a text field to your content type.'),
}

// Bad - Hardcoded English
{
    label: 'Text Field',
    tooltip: 'Adds a text field to your content type.',
}
```

### 3. Default Values in Settings

Provide sensible defaults in editor component:

```javascript
const placeholder = op.get(settings, 'placeholder', '');
const required = op.get(settings, 'required', false);
const defaultValue = op.get(settings, 'defaultValue', '');
```

### 4. Validation in Editor

Validate settings and provide user feedback:

```javascript
const min = op.get(settings, 'min');
const max = op.get(settings, 'max');

const handleChange = (newValue) => {
    if (min && newValue.length < min) {
        // Show error or prevent change
        return;
    }

    if (max && newValue.length > max) {
        // Truncate or show error
        newValue = newValue.slice(0, max);
    }

    onChange(newValue);
};
```

### 5. Use hookableComponent Pattern

Make field types extensible:

```javascript
const FieldTypeDialog = useHookComponent('FieldTypeDialog', DragHandle);
const MediaPicker = useHookComponent('MediaPicker');
```

### 6. Order Convention

Use priority enums for predictable sorting:

```javascript
order: Reactium.Enums.priority.highest     // -1000000 (system fields)
order: Reactium.Enums.priority.high        // -100000
order: Reactium.Enums.priority.neutral - 5 // -5 (common fields)
order: Reactium.Enums.priority.neutral     // 0 (default)
order: Reactium.Enums.priority.neutral + 5 // 5 (special fields)
order: Reactium.Enums.priority.low         // 100000
order: Reactium.Enums.priority.lowest      // 1000000 (rarely used)
```

---

## Common Gotchas

### 1. Missing Component Registration

**Problem:**

```javascript
// Only registered field type, not components
Reactium.ContentType.FieldType.register(ID, fieldType);
```

**Solution:**

```javascript
// Register all three: type, config component, editor component
Reactium.ContentType.FieldType.register(ID, fieldType);
Reactium.Component.register(fieldType.component, FieldType);
Reactium.Content.Editor.register(ID, { component: Editor });
```

### 2. Settings Not Persisting

**Problem:**

```javascript
// Missing name attribute - setting won't save
<input placeholder={__('Default Value')} />
```

**Solution:**

```javascript
// name attribute becomes setting key
<input name="defaultValue" placeholder={__('Default Value')} />
```

### 3. onChange Not Called

**Problem:**

```javascript
// Updating local state, not calling onChange
const [localValue, setLocalValue] = useState(value);
<input value={localValue} onChange={e => setLocalValue(e.target.value)} />
```

**Solution:**

```javascript
// Call onChange prop to update parent
<input value={value} onChange={e => onChange(e.target.value)} />
```

### 4. Settings Undefined

**Problem:**

```javascript
// Crashes if settings not configured
const placeholder = settings.placeholder;
```

**Solution:**

```javascript
// Use object-path with defaults
const placeholder = op.get(settings, 'placeholder', '');
```

### 5. Registration Timing

**Problem:**

```javascript
// Registering immediately - plugin may not be ready
Reactium.ContentType.FieldType.register(ID, fieldType);
```

**Solution:**

```javascript
// Wait for plugin registration
Reactium.Plugin.register(`CTE-${ID}`).then(() => {
    Reactium.ContentType.FieldType.register(ID, fieldType);
    // ... register components
});
```

### 6. Component ID Mismatch

**Problem:**

```javascript
// component ID doesn't match registration
{ component: 'FieldTypeText' }
Reactium.Component.register('TextFieldType', FieldType); // Wrong ID!
```

**Solution:**

```javascript
// Ensure IDs match exactly
{ component: 'FieldTypeText' }
Reactium.Component.register('FieldTypeText', FieldType); // Correct!
```

---

## Integration with Content Type System

### Field Type → Schema Mapping

When a content type is saved, field types map to Parse Server schema types:

| Field Type | Parse Schema Type | Example |
|------------|------------------|---------|
| Text | String | `{ type: 'String' }` |
| Number | Number | `{ type: 'Number' }` |
| Boolean | Boolean | `{ type: 'Boolean' }` |
| Date | Date | `{ type: 'Date' }` |
| Array | Array | `{ type: 'Array' }` |
| Object | Object | `{ type: 'Object' }` |
| Pointer | Pointer | `{ type: 'Pointer', targetClass: 'User' }` |
| File | File | `{ type: 'File' }` |
| RichText | Object | `{ type: 'Object' }` (custom structure) |

**Source**: Backend schema creation in `actinium-type/plugin.js` via `type-saved` hook

---

## Discovered During Research

**New Topics for Future Research:**

- **FieldTypeDialog hookable component** - Wrapper providing consistent field configuration UI with drag handles, delete buttons, and collapse behavior
- **MediaPicker component integration** - Media library integration patterns for file/image fields
- **Content.QuickEditor registry** - Quick edit component registration (currently TODO in codebase)
- **Content.Comparison registry** - Revision comparison component registration (currently TODO in codebase)

---

## Summary

The Field Type Plugin System provides a **complete, three-registry architecture** for extending Reactium Admin's Content Type Editor:

1. **ContentType.FieldType** - Field type definitions (metadata)
2. **Component** - Configuration UI components (settings)
3. **Content.Editor** - Editor UI components (value editing)

**Critical for:**
- Custom CMS field types
- Domain-specific content modeling
- Third-party integrations (maps, media, commerce)
- Workflow-specific fields (approval, versioning)

**Key Pattern:**
- Register field type metadata
- Provide configuration component for settings
- Provide editor component for value editing
- Settings from config component flow to editor component
- All components use hookableComponent for extensibility
