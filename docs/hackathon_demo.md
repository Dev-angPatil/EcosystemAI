# EcosystemAI — Hackathon Presentation & Live Demo Guide

This presentation guide is structured in the high-impact 4-part hackathon pitch format. Use this script to showcase **EcosystemAI** to the judges.

---

## 1. The Problem — ~20 seconds 🎯

**Pitch (1 sentence):**
> "For ecology educators and conservation agencies struggling with fragmented models, EcosystemAI consolidates canopy physiology, trophic food webs, and soil biogeochemistry into a single interactive digital twin, replacing abstract differential equations with immediate visual feedback."

---

## 2. The App in Action — ~90 seconds 💻

*Show the application running live on screen. Do not show slides. Click buttons and show real-time updates.*

* **Select Biome & Run (0s - 30s)**:
  * **Action**: Point to the ClickHouse-inspired layout. Click the **Biome** dropdown and switch from **Temperate Forest** to **Coastal Marine**. Click **Run Simulation**.
  * **Script**: *"We start in our 3-pane workstation. Changing the biome instantly reloads our species interactions, and hitting 'Run Simulation' sends the ODE solver workload to the cloud. As we play the timeline, notice the SVG food web nodes expanding and contracting based on biomass density, with animated particles tracing energy flows in real time."*

* **Canopy Physiology & Drought Stress (30s - 60s)**:
  * **Action**: Click the **Canopy Physiology** tab. Drag **Average Temperature** slider to 38°C and **Relative Humidity** to 12%.
  * **Script**: *"Next, let's trigger a drought. Watch the guard cell stoma simulator shut its pore in real time as calculated stomatal conductance drops to zero. Below, our Farquhar curves redraw instantly, with the net assimilation line tracing Rubisco and light limitations, and firing a red photorespiration stress warning."*

* **Soil Biogeochemistry & Liebig's Law (60s - 90s)**:
  * **Action**: Click the **Soil & Biogeochemistry** tab. Drag **Soil Nitrogen** slider down to 5%.
  * **Script**: *"Now look at the Soil Biogeochemistry pane. In our Century kinetic model, you can see carbon and nitrogen flowing through active, slow, and passive pools. By plunging soil nitrogen, Liebig's Law of the Minimum index drops, limiting plant growth and triggering a red nitrogen warning. On the right, our real-time Socratic AI Coach diagnoses this trophic cascade and guides our next run."*

---

## 3. Your Database Choice — ~30 seconds 🗄️

**Pitch (Why Amazon Aurora DSQL is the right architectural choice):**
> "EcosystemAI generates 3,000 spatial state records per run, requiring tight coupling between carbon, nitrogen, and phosphorus stoichiometry across grid cells. We chose **Amazon Aurora DSQL (Distributed SQL)** because it was the only database that satisfied our three architectural requirements:
>
> 1. **Relational ACID Transactions**: To enforce physical conservation of mass laws across coupled chemical equations, we need strict multi-row transaction guarantees that NoSQL databases cannot reliably enforce.
> 2. **Active-Active Distributed Writes**: For collaborative classrooms or regional digital twins with hundreds of concurrent users, Aurora DSQL allows students globally to write to the database simultaneously with sub-millisecond local latency and zero replication lag.
> 3. **Scale-to-Zero Serverless**: Our usage is highly bursty—spiking during lab hours and dropping to zero overnight. DSQL matches this profile perfectly, giving us production-grade durability while eliminating idle server costs."

---

## 4. The "So What" — ~20 seconds 🚀

**Pitch (Value & scale potential):**
> "EcosystemAI replaces static, offline spreadsheets with a collaborative, cloud-scale workspace for the world's 25,000+ environmental science departments. By proving we can run complex ecological digital twins on a serverless AWS and Vercel stack, we are making high-fidelity environmental modeling accessible to any researcher or student on Earth."
