module gam_core

/*
 * ============================================================================
 *  GAM — Governance Analysis Model : core metamodel
 * ============================================================================
 *  Formalises the requirements system of thesis section 4.4 (as revised):
 *
 *      PHI = < P, A, R, U ;  PP, PA, RR, S, X,  RA±, RU±, UP±, D± >
 *
 *  Two corrections to the 2009 formulation are load-bearing here:
 *
 *   (1) POLARITY.  Every policy relation is split into a permitted (+) and a
 *       prohibited (-) part.  The original gave each modality a single
 *       membership condition, so "Deny" was indistinguishable from silence and
 *       permit/deny conflict could not be derived.
 *
 *   (2) CLOSURE.   Conflict is evaluated over EFFECTIVE access -- the closure
 *       of the declared relations under role inheritance and process
 *       composition -- not over the declared relations themselves.  Every
 *       interaction of interest lives in the closure.
 *
 *  Law and enterprise share one vocabulary and one universe.  Legal
 *  prohibitions populate the (-) relations and are therefore checked by Con;
 *  legal structural requirements are expressed as assertions.
 * ============================================================================
 */

-- ---------------------------------------------------------------- sorts ----

abstract sig Delegable {}

sig Process extends Delegable {
  subProcess : set Process,     -- PP : parent -> child
  activity   : set Activity,    -- PA
  sep        : set Process      -- X  : separation of concerns
}

sig Activity extends Delegable {
  next : set Activity           -- S  : immediate succession
}

one sig Unrestricted extends Delegable {}   -- the top element for delegation

sig Role {
  subRole         : set Role,        -- RR : parent -> child
  mayDo           : set Activity,    -- RA+
  mustNotDo       : set Activity,    -- RA-
  mayReach        : set Process,     -- RP+ : role-level process grant
  mustNotReach    : set Process,     -- RP-
  mayDelegate     : Role -> Delegable,   -- D+
  mustNotDelegate : Role -> Delegable    -- D-
}

sig User {
  mayAct        : set Role,      -- RU+
  mustNotAct    : set Role,      -- RU-
  mayAssume     : set Process,   -- UP+
  mustNotAssume : set Process    -- UP-
}

-- --------------------------------------------------- well-formedness ----

fact WellFormed {
  -- process and role hierarchies are strict partial orders
  no p : Process | p in p.^subProcess
  no r : Role    | r in r.^subRole
  -- separation of concerns is symmetric and irreflexive
  sep = ~sep
  no p : Process | p in p.sep
  -- a role does not delegate to itself
  no r : Role | some (r.mayDelegate + r.mustNotDelegate)[r]
}

-- ------------------------------------------------------- closures ----

/** every activity of p, at any composition depth  (PA*) */
fun act [p : set Process] : set Activity { p.*subProcess.activity }

/** every process reachable from p by composition  (PP*) */
fun proc [p : set Process] : set Process { p.*subProcess }

/** activities a role effectively commands: its own plus those of every role
    it includes (senior inherits junior) */
fun rolePermits [r : set Role] : set Activity { r.*subRole.mayDo }
fun roleForbids [r : set Role] : set Activity { r.*subRole.mustNotDo }

/** processes a user effectively reaches (UP*).  Three sources: direct
    user->process assignment, the role-level grant of any role the user holds
    (inherited down the hierarchy), and delegation.  The 2009 formulation had
    only the first; real access-control models grant zones through roles, and
    omitting that path makes whole classes of over-broad credential invisible. */
fun effProc [u : set User] : set Process {
  proc[u.mayAssume]
  + proc[rolePermitsProc[u.mayAct]]
  + proc[delegatedProcs[u.mayAct]]
}

/** processes a role effectively grants, through inheritance */
fun rolePermitsProc [r : set Role] : set Process { r.*subRole.mayReach }
fun roleForbidsProc [r : set Role] : set Process { r.*subRole.mustNotReach }

/** activities a role acquires by delegation from a role that legitimately
    holds them.  Unrestricted (top) delegates the delegator's whole holding --
    this is how an over-broad credential is modelled. */
fun delegatedActs [t : set Role] : set Activity {
  { a : Activity | some r : Role |
        ((t -> a) in r.mayDelegate or (t -> Unrestricted) in r.mayDelegate)
        and a in rolePermits[r] }
}

/** processes a role acquires by delegation */
fun delegatedProcs [t : set Role] : set Process {
  { p : Process | some r : Role | (t -> p) in r.mayDelegate }
}

/** activities a user effectively reaches (RA*) -- via role inheritance, via
    delegation, OR via any process assumed at any depth.  This is the relation
    that matters: every interaction of interest lives here and nowhere in the
    declared relations. */
fun effAct [u : set User] : set Activity {
  rolePermits[u.mayAct]
  + delegatedActs[u.mayAct]
  + act[u.mayAssume]
  + act[rolePermitsProc[u.mayAct]]      -- capabilities of any zone a role grants
  + act[delegatedProcs[u.mayAct]]
}

/** activities a user is effectively prohibited from */
fun effForbidden [u : set User] : set Activity { roleForbids[u.mayAct] }

/** is there a path from a1 to a2 through the sequence relation? (S+) */
pred traces [a1, a2 : Activity] { a2 in a1.^next }

-- ------------------------------------------------- CONSISTENCY  Con ----

/**
 * Con( /\PHI_E /\ /\PHI_L ).  Holds iff the combined model contains no
 * contradiction.  Each conjunct is a distinct violation class.
 */
pred Con {
  NoActivityConflict
  NoRoleOccupancyConflict
  NoProcessAccessConflict
  SeparationRespected
  DelegationSound
}

/** RA* /\ RA- = {} : nobody both reaches and is barred from an activity */
pred NoActivityConflict {
  no u : User | some (effAct[u] & effForbidden[u])
}

/** RU+ /\ RU- = {} */
pred NoRoleOccupancyConflict {
  no u : User | some (u.mayAct & u.mustNotAct)
}

/** UP* /\ UP- = {} , over both the user-level and role-level prohibitions */
pred NoProcessAccessConflict {
  no u : User | some (effProc[u] & (u.mustNotAssume + roleForbidsProc[u.mayAct]))
}

/** no user effectively reaches two processes held in separation of concerns */
pred SeparationRespected {
  no u : User | some p : effProc[u] | some (p.sep & effProc[u])
}

/** delegation may not confer what the recipient is barred from holding, and
    may not be simultaneously permitted and prohibited */
pred DelegationSound {
  no r : Role | some (r.mayDelegate & r.mustNotDelegate)
  no r, t : Role, a : Activity |
      (t -> a) in r.mayDelegate and a in roleForbids[t]
}

-- -------------------------------------------- ontology check helpers ----

/** structural: every required role edge is present in the hierarchy closure */
pred requiresRoleEdge [parent, child : Role] { child in parent.^subRole }

/** process composition, at any depth */
pred requiresSubProcess [parent, child : Process] { child in parent.^subProcess }

/** a process contains an activity, at any composition depth */
pred requiresActivity [p : Process, a : Activity] { a in act[p] }

/** sequencing: a1 eventually precedes a2 */
pred requiresPrecedence [a1, a2 : Activity] { traces[a1, a2] }
