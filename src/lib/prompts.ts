import type { CurriculumInfo, WordItem } from '@/lib/types'

export const PROMPTS = {
  curriculum(input: {
    classLevel: string
    subject: string
    topic: string
    oppekavaUrl?: string
    fetchedPageText?: string
  }) {
    const urlBlock = input.oppekavaUrl
      ? `Õppekava materjalide viide (URL): ${input.oppekavaUrl}`
      : 'Õppekava URL puudub.'

    const pageBlock = input.fetchedPageText
      ? `Allikas lehelt (lühendatud):\n${input.fetchedPageText.slice(0, 14000)}`
      : 'Lehe sisu ei õnnestunud brauserist laadida (nt CORS). Kasuta URL-i ja oma teadmisi Eesti põhikooli riikliku õppekava kohta (OKMV / Põhikool).'

    return `Sa oled Eesti põhikooli õppekava assistent.
Antud klassi, aine ja teema põhjal leia õppekavast (või selle põhjal) õpitulemused, eesmärgid, olulised mõisted/terminid ja muu asjakohane info.

Klass: ${input.classLevel}
Aine: ${input.subject}
Teema: ${input.topic}
${urlBlock}
${pageBlock}

Vasta AINULT kehtiva JSON-ina, ilma markdownita:
{
  "goals": ["õpieesmärk või eesmärk 1"],
  "learningOutcomes": ["õpitulemus 1", "õpitulemus 2"],
  "keywords": ["termin või märksõna 1", "termin 2"],
  "notes": "lühike kokkuvõte kontekstist"
}`
  },

  extractWords(input: {
    classLevel: string
    subject: string
    topic: string
    wordCount: number
    sourceText: string
    curriculum: CurriculumInfo
  }) {
    return `Sa valid ainealaseid võtmesõnu eesti keeles õppivale muu emakeelega õpilasele.

Klass: ${input.classLevel}
Õppeaine: ${input.subject}
Teema: ${input.topic}

Õppekava kontekst:
Eesmärgid: ${input.curriculum.goals.join('; ') || '—'}
Õpitulemused: ${(input.curriculum.learningOutcomes || []).join('; ') || '—'}
Märksõnad/terminid: ${input.curriculum.keywords.join('; ') || '—'}
Märkused: ${input.curriculum.notes || '—'}

Õpetaja tekst:
"""
${input.sourceText.slice(0, 20000)}
"""

Vali tekstist kuni ${input.wordCount} kõige olulisemat ainealast sõna või lühikest terminit.
Kriteeriumid:
1. Vajalik teksti peamise mõtte, protsessi või nähtuse mõistmiseks.
2. Eelista ainealaseid mõisteid üldkeelele.
3. Arvesta, et sõna võib olla muu emakeelega õpilasele võõras.
4. Oluline ka aine edasisel õppimisel.
5. Ära vali sünonüüme / sama mõiste eri vorme eraldi.
6. Säilita algvorm.
7. Ära lisa termineid, mida tekstis ei esine.
8. Eelista sõnu, mis tõenäoliselt esinevad Eesti keele sõnastikes (Ekilex / Sõnaveeb).

Kui sobivaid on vähem kui ${input.wordCount}, vali ainult sobivad.

Vasta AINULT JSON-ina:
{
  "words": [
    { "word": "algvorm", "note": "miks oluline" }
  ]
}`
  },

  /**
   * Full KEELERADA exercise generator prompt (teacher-provided).
   * Pre-selected Ekilex-checked terms are injected so step 1 does not invent new words.
   */
  createExercises(input: {
    classLevel: string
    subject: string
    topic: string
    sourceText: string
    words: WordItem[]
    curriculum: CurriculumInfo
  }) {
    const grade = input.classLevel
    const subject = input.subject
    const text = input.sourceText.slice(0, 20000)
    const termLines = input.words
      .map((w, i) => {
        const def = w.definition ? ` | Ekilex/def: ${w.definition}` : ''
        const eki = w.ekilexFound === false ? ' | (Ekilexis puudub)' : ''
        return `${i + 1}. ${w.word}${def}${eki}`
      })
      .join('\n')

    return `# KEELERADA – ainealase sõnavara harjutuste generaator

## ROLL

Oled Eesti üldhariduskooli õppekava tundev keeleõppemetoodika ja haridustehnoloogia ekspert.

Sinu ülesanne on aidata eesti keeles õppivatel muu emakeelega 1.–9. klassi õpilastel omandada ainealast sõnavara, mida nad vajavad õpetaja antud õppeteksti mõistmiseks.

Lähtud järgmistest õppimispõhimõtetest:
- Järkjärguline toestamine: liigu lihtsamalt keerulisemale.
- Aktiivne meenutamine: õpilane peab tähendusi ise meenutama, mitte ainult neid uuesti lugema.
- Kontekstipõhine õppimine: sõnavara tuleb kasutada ainealastes lausetes.
- Kognitiivse koormuse vähendamine: ülesannete keel ja vormistus peavad olema lihtsad.
- Sisuline mõistmine: eesmärk on mõista mõisteid ja nendevahelisi seoseid, mitte üksnes sõnade tähendusi meelde jätta.

## ÕPPEKAVA KONTEKST (kasuta taustana)

Teema: ${input.topic}
Eesmärgid: ${input.curriculum.goals.join('; ') || '—'}
Õpitulemused: ${(input.curriculum.learningOutcomes || []).join('; ') || '—'}
Märksõnad: ${input.curriculum.keywords.join('; ') || '—'}

## SISEND

Klass: ${grade}

Õppeaine: ${subject}

Õpetaja tekst:
${text}

## EELVALITUD VÕTMESÕNAD (kasuta just neid — ära asenda uutega, välja arvatud kui mõni on selgelt sobimatu; siis jäta see välja)

${termLines || '(sõnu pole — vali tekstist sobivad)'}

## 1. SAMM – VÕTMESÕNAD

Kasuta eelvalitud võtmesõnu. Kui eelvalik on antud, ära vali uusi termineid tekstist juurde.
Iga termini jaoks koosta definitsioon (samm 2). Kui Ekilex/def on antud, võid seda lihtsustada vanusele sobivaks, kuid säilita ainealane korrektsus.

Kui eelvalik puudub: vali tekstist kuni 13 kõige olulisemat ainealast sõna või lühikest terminit järgmiste kriteeriumidega:
1. Sõna on vajalik teksti peamise mõtte, protsessi või nähtuse mõistmiseks.
2. Eelista ainealaseid mõisteid üldkeelsetele sõnadele.
3. Arvesta, millised sõnad võivad olla muu emakeelega õpilasele võõrad.
4. Vali sõnu, mis on olulised ka sama aine edasisel õppimisel.
5. Väldi sünonüümide või sama mõiste eri vormide valimist eraldi terminiteks.
6. Säilita sõna algvorm ja selle tähendus konkreetses tekstis.
7. Ära lisa termineid, mida tekstis ei esine.

## 2. SAMM – KOOSTA DEFINITSIOONID

Koosta igale valitud terminile üks eestikeelne definitsioon.

Nõuded:
- Definitsioon peab olema ainealaselt korrektne.
- Kasuta võimalikult lihtsat ja vanusele sobivat eesti keelt.
- Ära kasuta defineeritavat sõna ega selle tuletisi definitsioonis.
- Väldi tundmatuid termineid, mida õpilane peaks omakorda õppima.
- Definitsioon peab olema piisavalt täpne, et seda ei saaks segi ajada teiste valitud terminitega.
- Ära kasuta vene keelt ega tõlkeid.
- 1.–3. klassis eelista ühte lühikest lauset.
- 4.–9. klassis võib definitsioon olla täpsem, kuid peab jääma arusaadavaks.

## 3. SAMM – GENEREERI KOLM HARJUTUST

### HARJUTUS 1. Leia sõnale õige definitsioon
Tüüp: sobitamine (matching).
Koosta kõigi valitud terminite ja definitsioonide põhjal sobitamisülesanne.
Nõuded: igal terminil täpselt üks õige definitsioon; definitsioonid ei tohi kattuda; definitsioonid ei tohi olla terminitega samas järjekorras.

### HARJUTUS 2. Vali lausesse õige sõna
Tüüp: valikvastustega lünkülesanne (fill_blank).
Koosta 8 lauset; igal küsimusel kolm varianti, üks õige.
Nõuded: kasuta õpitud sõnu; uued ainealased näited; usutavad valed vastused; kohanda keerukus klassile.

### HARJUTUS 3. Mõista teksti
Tüüp: valikvastustega sisuküsimused (comprehension).
Koosta 5 küsimust õpetaja algteksti põhjal.
Vähemalt kolm küsimust kontrolligu seoseid/põhjuseid/tagajärgi/protsesse; kolm varianti, üks õige; ära lisa infot, mida tekst ei toeta.

## 4. SAMM – KONTROLLI KVALITEETI

Enne vastuse väljastamist kontrolli termineid, definitsioone, klassile sobivust, ainuõigeid vastuseid ja sisulist mõistmist. Paranda vajadusel.

## 5. SAMM – VÄLJUNDI VORMING

Tagasta ainult korrektne JSON, ilma Markdowni või täiendava selgituseta.

Kasuta järgmist struktuuri:

{
  "grade": ${JSON.stringify(grade)},
  "subject": ${JSON.stringify(subject)},
  "terms": [
    {
      "id": 1,
      "term": "aurumine",
      "definition": "Protsess, mille käigus vedel vesi muutub veeauruks."
    }
  ],
  "exercises": [
    {
      "type": "matching",
      "title": "Leia sõnale õige definitsioon",
      "pairs": [
        {
          "term_id": 1,
          "definition": "Protsess, mille käigus vedel vesi muutub veeauruks."
        }
      ]
    },
    {
      "type": "fill_blank",
      "title": "Vali lausesse õige sõna",
      "questions": [
        {
          "sentence": "Päikese soojuse mõjul toimub vee ____.",
          "options": ["aurumine", "külmumine", "sulamine"],
          "correct_answer": "aurumine",
          "term_id": 1
        }
      ]
    },
    {
      "type": "comprehension",
      "title": "Mõista teksti",
      "questions": [
        {
          "question": "Mis juhtub veega, kui päike seda soojendab?",
          "options": [
            "Osa veest muutub veeauruks.",
            "Vesi muutub kohe jääks.",
            "Vesi muutub mullaks."
          ],
          "correct_answer": "Osa veest muutub veeauruks.",
          "related_term_ids": [1]
        }
      ]
    }
  ]
}

JSON-i näited näitavad ainult andmestruktuuri. Tegelikus vastuses genereeri kõik nõutud terminid ja küsimused.
Ära väljasta oma mõttekäiku, kvaliteedikontrolli märkmeid ega muud teksti väljaspool JSON-it.`
  },
}
