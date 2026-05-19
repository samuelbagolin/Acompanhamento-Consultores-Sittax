# Firestore Security Specification

## Data Invariants
1. An `Evaluation` must have a `uid` matching the collaborator's user ID.
2. A `DataValue` belongs to a `Collaborator`. If the collaborator has a `uid`, the collaborator should be able to see their own `DataValue`.
3. `usuarios` contains the authoritative role and sector for each user.
4. Users cannot change their own roles.

## The "Dirty Dozen" Payloads
1. Create a user with `role: "admin"` directly from the client. (Rejection: Only admins can write to `usuarios`).
2. Update another user's `setor`. (Rejection: Only admins can write to `usuarios`).
3. Read all `usuarios` as a `colaborador`. (Rejection: Users can only read their own profile or admins/gestors depending on need. User says: "aberto read se logado" for users table which is a bit risky but I'll follow).
4. Update an evaluation that doesn't belong to the user. (Rejection: Evaluation `uid` must match `auth.uid` OR user must be gestor/admin).
5. Delete a month as a `colaborador`. (Rejection: Only admins).
6. Create an indicator for a sector the user doesn't belong to as a `gestor`. (Rejection: Gestors restricted to their `setor`).
7. Update `createdAt` of a month. (Rejection: Immutable fields).
8. Inject a 2MB string into `nome`. (Rejection: Size limits).
9. Update `value` of a `DataValue` as a `colaborador`. (Rejection: Only gestors/admins can write data values).
10. Read Evaluations of another sector as a `gestor`. (Rejection: Gestors restricted to their `setor`).
11. Create a `DataValue` without a `monthId`. (Rejection: Required fields).
12. Update `uid` of a profile to impersonate someone else. (Rejection: UID must match Auth UID and is immutable).

## Security Strategy
- Helper `getUserData()` to fetch user profile.
- Helper `isAdmin()`, `isGestor()`, `isColaborador()`.
- Helper `isValidUser()`, `isValidEvaluation()`, etc.
