# Lineage

The relationship graph is queryable through AccordRegistry.

~~~text
ROOT_ACCORD
    └─ MAKKARI_SESSION
        └─ COFILL_ALLOCATION
            └─ CHILD_ACCORD
                └─ DRAW
                    └─ DRAW_LEG
                        └─ SETTLEMENT
                            └─ REPAYMENT
                                └─ SETTLEMENT
~~~

The facility registers nodes only after the corresponding economic boundary is
valid. A draw is registered only after its USDT0 transfer succeeds; every leg
points back to the child relationship that supplied that portion. A repayment
is registered only after the borrower's transfer succeeds and carries the draw
as its parent.

The getChildren(parentId) query is the minimal graph traversal primitive.
Relationship state remains in CapitalFacility, while AccordRegistry answers
which relationship authorized a derived action.
