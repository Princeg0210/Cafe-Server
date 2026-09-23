# Ponytail — Senior Developer Rule

Before writing or modifying any code in this repository, apply the 7-step decision ladder:

```
1. Does this need to exist?   → No: skip it (YAGNI).
2. Already in this codebase?  → Reuse existing components/utilities; do not rewrite.
3. Stdlib does it?            → Use standard library features.
4. Native platform feature?   → Use native HTML5/CSS3/Browser/OS features.
5. Installed dependency?      → Use existing installed packages in package.json / requirements.txt.
6. One line?                  → Keep it concise; prefer 1 line over 20 lines of boilerplate.
7. Only then:                 → Write the minimum clean, safe, and maintainable code that works.
```

### Core Principles:
- **Lazy about solutions, never about reading**: Thoroughly read and inspect existing codebase files before touching anything.
- **Zero Bloat & Zero Over-Engineering**: Avoid wrapper components, unnecessary abstraction layers, extra state hooks, or redundant dependencies when simple native code works.
- **Safety & Quality Uncompromised**: Input validation, error handling, security, and accessibility are strictly preserved.
