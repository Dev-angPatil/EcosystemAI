# EcosystemAI — Hackathon Presentation & Live Demo Guide (Academic Focus)

This presentation guide is structured in the high-impact 4-part hackathon pitch format, optimized for academic impact. Use this script to showcase **EcosystemAI** to the judges.

---

## 1. The Problem — ~20 seconds 🎯

**Pitch (1 sentence):**
> "For university ecology professors and students struggling with static, offline spreadsheets, EcosystemAI transforms complex, multi-scale biophysical models—like leaf-level photosynthesis equations and lake-level bifurcation curves—into an interactive, real-time digital classroom workstation."

---

## 2. The App in Action — ~90 seconds 💻

*Show the application running live on screen. Do not show slides. Click buttons and show real-time updates.*

* **Canopy Physiology & Environmental Sliders (0s - 35s)**:
  * **Action**: Start on the **Canopy Physiology** tab. Point to the 3-pane layout: Left Controls, Center Workstation, Right Socratic AI Coach. Drag the **Average Temperature** slider to 38°C and **Relative Humidity** to 12%.
  * **Script**: *"We start in our 3-pane digital lab. Under Canopy Physiology, we drag temperature up and humidity down to trigger a heat wave. In real-time, the guard cell stoma simulator closes its pore as stomatal conductance drops to prevent transpiration. Below, the Farquhar assimilation curves redraw instantly, showing net assimilation ($A_{net}$) tracing Rubisco and light limitations, and triggering a C3 photorespiration stress warning."*

* **Photosynthetic Pathway Adaptations (35s - 50s)**:
  * **Action**: In the Left Sidebar under Species, click on **Grass** and change its pathway from **C3** to **C4**.
  * **Script**: *"Students can test evolutionary adaptations. By switching the species pathway from C3 to C4, the stoma dynamically re-opens under high temperature, showcasing how carbon concentration mechanisms optimize Water-Use Efficiency (WUE) under heat stress."*

* **Shallow Lake Hysteresis Loop (50s - 75s)**:
  * **Action**: Click the **Lake Hysteresis Lab** tab. Click **Initiate Loading Loop**.
  * **Script**: *"Next, we explore bifurcation theory. We initiate a nutrient loading loop. The simulator sweeps phosphorus levels up and down, drawing the forward and backward hysteresis curves. It visually demonstrates why recovering a turbid, algae-choked lake requires dropping nutrient levels far below the initial tipping point, teaching complex non-linear dynamics."*

* **Literature Corner & Socratic AI Partner (75s - 90s)**:
  * **Action**: Click **Literature Corner**. Point to the fetched papers. Click **Inject Rates** on a paper. Point to the Socratic AI Coach on the right.
  * **Script**: *"Finally, we connect classroom theory to real-world research. The Literature Corner pulls papers from OpenAlex and bioRxiv. With one click, we inject published rates directly into our simulation parameters. Meanwhile, our Socratic AI Coach analyzes our actions, diagnosing tipping points and posing conceptual questions to guide the student's next hypothesis."*

---

## 3. Your Database Choice — ~30 seconds 🗄️

**Pitch (Why Amazon Aurora DSQL is the right architectural choice):**
> "EcosystemAI generates thousands of coupled biophysical records per run, requiring tight conservation of mass stoichiometry (Carbon-Nitrogen-Phosphorus ratios) across ecosystem states. We chose **Amazon Aurora DSQL (Distributed SQL)** because it was the only database that satisfied our three architectural requirements:
>
> 1. **Relational ACID Transactions**: To enforce physical conservation laws across coupled equations, we require strict multi-row relational integrity that NoSQL databases cannot reliably guarantee.
> 2. **Active-Active Distributed Writes**: In a classroom setting with hundreds of students running simulation sweeps concurrently, Aurora DSQL allows students globally to write to the database simultaneously with sub-millisecond local latency and zero replication lag.
> 3. **Scale-to-Zero Serverless**: Student usage is highly bursty—spiking during lab hours and dropping to zero overnight. DSQL matches this profile perfectly, eliminating idle server costs while scaling instantly."

---

## 4. The "So What" — ~20 seconds 🚀

**Pitch (Value & scale potential):**
> "EcosystemAI replaces outdated, static worksheets with a cloud-scale interactive learning environment for the world's 25,000+ university environmental science programs. By proving we can run high-fidelity biophysical digital twins on a serverless AWS and Vercel stack, we are bringing active, research-grade systems thinking to the next generation of environmental scientists."
