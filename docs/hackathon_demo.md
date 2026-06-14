# EcosystemAI — Hackathon Presentation & Live Demo Guide

This presentation guide is structured in the high-impact 4-part hackathon pitch format, optimized for the **Undergraduate Coursework & LMS Integration** theme. Use this script to showcase **EcosystemAI** to the judges.

---

## 1. The Problem — ~20 seconds 🎯

**Pitch (1 sentence):**
> "For university ecology professors and undergraduate students struggling with dry textbooks and offline spreadsheets, EcosystemAI transforms abstract differential equations into a collaborative, real-time biophysical digital twin that integrates guided lab missions and Socratic AI coaching directly into the classroom curriculum."

---

## 2. The App in Action — ~90 seconds 💻

*Show the application running live on screen. Do not show slides. Click buttons and show real-time updates.*

* **Canopy Physiology & Transpiration Lab (0s - 30s)**:
  * **Action**: Start in the **Canopy Physiology** tab. Drag the **Average Temperature** slider to 38°C and **Relative Humidity** down to 12%.
  * **Script**: *"We begin in our 3-pane classroom workstation. Let's trigger extreme heat stress. Notice our guard cell stoma simulator dynamically closing its pore in real time as calculated stomatal conductance drops to zero. Below, the Farquhar curves redraw instantly, showing the student how net carbon assimilation transitions from Rubisco-limited to light-limited pathways under drought conditions."*

* **Biodiversity Lab (BEF) Experiment (30s - 60s)**:
  * **Action**: Click the **Biodiversity Lab** tab. Check 3 producer species, then click the **Run BEF Experiment** button.
  * **Script**: *"Next, we open the Biodiversity Lab to study the Niche Insurance Effect. By selecting multiple producer species with different temperature optima and clicking 'Run BEF Experiment', Vercel instantly triggers a batch of 10 simulations in parallel. The results graph on the fly, proving to the student that species-rich communities maintain stable ecosystem functioning under fluctuating climates."*

* **Lake Hysteresis & Socratic Certified Quiz (60s - 90s)**:
  * **Action**: Click the **Lake Hysteresis Lab** tab. Click **Guided Lab Missions** on the top right to open the drawer. Select **Shallow Lake Hysteresis**.
  * **Script**: *"Finally, let's open our Guided Lab Missions. We select 'Shallow Lake Hysteresis' which loads the challenge parameters. Once the student completes the simulation run, they take the integrated assessment quiz. When they submit their answers, the LMS validates them, certifies their score, and the Socratic AI Coach on the right dynamically adapts its prompts to guide their learning."*

---

## 3. Your Database Choice — ~30 seconds 🗄️

**Pitch (Why Amazon Aurora DSQL is the right architectural choice):**
> "EcosystemAI generates thousands of spatial state records per simulation, requiring strict mass-conservation stoichiometry across coupled biophysical pools. We chose **Amazon Aurora DSQL (Distributed SQL)** because it is the only database that meets our three academic requirements:
>
> 1. **Relational ACID Transactions**: To prevent physical bugs (like carbon or nitrogen molecules duplicating or disappearing during student runs), we need strong relational consistency and multi-row transaction guarantees.
> 2. **Active-Active Distributed Writes**: During concurrent classroom lab sessions where hundreds of students execute and record simulations simultaneously, Aurora DSQL scales horizontally with sub-millisecond local write latency and zero replication lag.
> 3. **Scale-to-Zero Serverless Cost**: Our traffic is highly bursty—spiking during university hours and dropping to zero at night. DSQL matches this profile perfectly, eliminating idle server costs while remaining production-grade."

---

## 4. The "So What" — ~20 seconds 🚀

**Pitch (Value & scale potential):**
> "EcosystemAI replaces static, fragmented biology coursework with an active, cloud-scale learning desk. By serving the world's 25,000+ environmental science departments, we are proving that complex ecological digital twins can be run serverless, providing a shippable SaaS product that changes how environmental sciences are taught globally."
