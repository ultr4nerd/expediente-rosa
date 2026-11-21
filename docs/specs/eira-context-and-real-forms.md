---
title: EIRA context and real forms
description: How EIRA runs jornadas, the fields on its Pap smear and breast exam forms, and the mentors' answers
read_when: Designing forms, fields, roles or autofill and validation rules
id: eira-context-and-real-forms
status: current
updated: 2026-11-21
tags: [dominio, formatos]
---

# EIRA context and real forms

## Operations

EIRA Movimiento Rosa A.C. (Ciudad Guzmán, Jalisco; founded in 2017; more than 51,000 people served as of Sept. 2026) runs screening *jornadas* (field medical days: Pap smear, breast ultrasound, physical exam, nutrition) in rural communities in Jalisco, Oaxaca, Guerrero and the sierra, with up to 7 h of travel without signal. Today paper forms are filled in and then typed into Google Forms or Excel; the patient is identified by name. EIRA shared the original forms (PDF and photos) for the hackathon and they are **not published in this repo** without their authorization; only their structure is described here.

## EIRA's real forms

Sources: "Formato citología EIRA.pdf" (cervical cytology request and report, 31 *reactivos*, i.e. numbered form items) and "Formato de revisión mamaria" (breast exam form, 2 photos, 24 *reactivos*). "Definición de retos.pdf" repeats the Devpost text.

### What changes the design

1. **The identification block repeats on both forms**: name, state of birth, EIRA ID, date of birth, age, usual residence, phone (landline/mobile), other address/phone, email, health coverage (INSABI, IMSS, ISSSTE, PEMEX, SEDENA, SEMAR, none, other) + coverage number. A patient who gets a Pap smear (*citología/Papanicolaou*) and an ultrasound the same day fills it in **twice**. → The record stores identity once; each service is a per-visit form.
2. **An "ID EIRA" already exists** (boxes on both forms) and a **"Folio EIRA"** per form, plus the question **"¿Cuenta con Cartilla EIRA? Sí/No"** (does she have the *Cartilla EIRA* patient card?). → Do not invent another identifier without asking: the stable internal ID can be that EIRA ID, and the *Cartilla EIRA* is where the folio/QR goes.
3. **There is no CURP field.** But name + date of birth + state of birth + sex are exactly the CURP inputs. → A "CURP-like" match key computed locally (first 16 characters, no homoclave) to group candidates; never as an official identifier.
4. **Fields the history can autofill**:
   - Cytology 11: "primera vez en la vida / primera vez después de 3 años / subsecuente" (first time ever / first time after 3 years / follow-up) → computed from the date of the last Pap smear.
   - Cytology 22.1: "número citológico anterior" (previous cytology number) → taken from the previous visit.
   - Breast 16/16.1/16.2: history and date of last mammogram.
   - Stable history (menarche, menopause, relatives with breast cancer, HPV vaccination) → confirmed instead of re-captured.
   Impact demo: second visit = confirm, not rewrite.
5. **Visit data** (not patient data): height, weight, BP, GLC, BT, AT; LMP (FUM); reason for visit; exam; sampling tool; professional license (*cédula*) of whoever takes the sample; sampling date.
6. **Results arrive later**: Bethesda (cytology), BIRADS 0-5 (breast), "repeat study", pathologist review. "Conducta a seguir" (next steps): routine in one year, mammogram, complementary imaging, evaluation in six months. → The record must accept the result as an event after the visit, and that yields a **pending follow-up** list (P2, connects with Challenge 4).
7. **Very sensitive data**: onset of sexual activity and age, multiple partners, STIs, smoking, pregnancy, hysterectomy. → Split by role: the *capturista* (data-entry staff) sees and edits identification and contact; clinical staff see history and the clinical part. The professional license (*cédula profesional*) ties each sample or study to a clinical person.
8. **Medical equipment**: CHISON 5 ultrasound with a 10 MHz transducer (fixed text on the form), thermography (symmetric/asymmetric).

### Cut for the prototype

- Full identity (common block).
- "Citología: solicitud" (Pap smear request) service: *reactivos* 11-22 in reduced form (11, 12, 13, 15, 16, 19, 20, 21, 22).
- "Revisión mamaria" (breast exam) service: 1, 10-17, 19, 22-24 reduced.
- Result (Bethesda/BIRADS) as a later event: optional.

## Answers from EIRA's mentors (11:09 call; Granola)

- **ID EIRA = Folio EIRA** (they are the same). EIRA assigns it; it is consecutive by number of records and resets every year, like official letters (*oficios*). It is unique and never repeats across *jornadas*.
  - ⚠️ Implication: a consecutive assigned offline on 2 laptops collides. Safe offline assignment is needed (blocks reserved per laptop, per-device prefix, or provisional ID + final number on sync).
- **Cartilla EIRA**: like a vaccination card; it is used to identify the patient at every visit. Still unknown what is printed on it and how many patients have one (they will confirm).
- **Hardware**: Windows. About 2 laptops per *jornada* (the doctor's and another person's).
- **Internet**: usually comes back the same day, at night, when they arrive to rest. (First call: Oaxaca, Guerrero, sierra; up to 7 h of travel without signal.)
- **Field team**: doctor (certified for every procedure), nutritionist and psychologist.
- **Capture at two moments**: the top part of the form (identification and key data) is captured live by EIRA; the pathology part (result) is captured later by the pathologist.
- **Conflicts**: per process, a single person captures each patient to avoid duplicates.
- **Sensitive history**: only the most specialized doctors see and correct it.
- **Volume**: highly variable, 15 to 20 min per patient; up to about 150 patients in the worst case (communities more than universities).
- **Retention**: about 5 years. Patients sign a privacy notice.
- **Value they expect**: control and centralization of data (today paper sheet + Excel), easy finding and capture, and fewer errors from fatigue ("after 100 records I no longer know if I'm capturing correctly" — "después de 100 expedientes ya no sé si estoy capturando bien").
