
# Hohoo-ville System Flow (Role-Based)

## 1. Admin
* Logs in
* Creates registrar, trainer, and trainee accounts
* Oversees user management and system setup

## 2. Registrar
* Logs in
* Creates qualifications/courses
* Adds trainers and assigns them to qualifications
* Creates batches and sets schedules
* Opens application form for trainees
* Reviews and approves/rejects trainee applications
* Assigns approved trainees to batches

## 3. Trainer
* Logs in
* Prepares modules, tasks, and lessons for assigned batches
* Schedules lessons and posts materials/quizzes
* Grades trainees

## 4. Trainee
* Logs in
* Fills out application form
* Waits for approval and batch assignment
* Attends training, completes modules/tasks
* Receives grades and notifications
* Receives certificate upon completion

---

```mermaid
flowchart TD
  subgraph Admin
    A1[Login]
    A2[Create Registrar Account]
    A3[Create Trainer Account]
    A4[Create Trainee Account]
    A1 --> A2
    A1 --> A3
    A1 --> A4
  end
  subgraph Registrar
    R1[Login]
    R2[Create Qualifications]
    R3[Add Trainers]
    R4[Assign Trainer to Qualification]
    R5[Create Batches]
    R6[Set Batch Schedule]
    R7[Open Application Form]
    R8[Review Applications]
    R9[Approve/Reject Applications]
    R10[Assign Trainee to Batch]
    R1 --> R2 --> R3 --> R4 --> R5 --> R6 --> R7
    R7 --> T1
    T1 --> R8 --> R9 --> R10
  end
  subgraph Trainer
    T2[Login]
    T3[Prepare Modules & Tasks]
    T4[Schedule Lessons]
    T5[Grade Trainees]
    T2 --> T3 --> T4
    T4 --> T6
    T6[Conduct Training]
    T6 --> T5
  end
  subgraph Trainee
    TR1[Login]
    TR2[Fill Application]
    TR3[Wait for Approval]
    TR4[Attend Training]
    TR5[Complete Modules/Tasks]
    TR6[Receive Grades]
    TR7[Receive Certificate]
    TR1 --> TR2 --> TR3
    TR3 --> R10
    R10 --> TR4 --> TR5 --> TR6 --> TR7
  end
  %% Cross-role connections
  A2 --> R1
  A3 --> R3
  A4 --> TR1
  R4 --> T2
  T5 --> TR6
  R10 --> T6
```

---

**Description:**
- This diagram shows the workflow by role: admin, registrar, trainer, and trainee.
- Each subgraph groups actions by role, with arrows showing the process and cross-role dependencies.
- Visualize this using Mermaid.js or compatible VS Code plugins.
