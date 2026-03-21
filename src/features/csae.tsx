import { ContentGutters } from "@/src/components/gutters";
import { MarkdownRenderer } from "../components/markdown/renderer";
import { IonContent, IonHeader, IonTitle, IonToolbar } from "@ionic/react";
import { PageTitle } from "../components/page-title";
import { Page } from "../components/page";

const POLICY = `
# Child Sexual Abuse & Exploitation (CSAE) Policy

**For:** Blorp

---

## 1. Zero‑Tolerance Statement  
I maintain a strict zero‑tolerance stance toward any form of child sexual abuse or exploitation (CSAE/CSAM) in content accessed through Blrop. Blrop is a third‑party client for Lemmy instances—you do not host content here directly. However, any CSAE/CSAM discovered via the app will be reported immediately to the instance moderators and, if necessary, to legal authorities.

---

## 2. Definitions  
- **Child Sexual Abuse Material (CSAM):**  
  Any depiction of sexual activities involving a minor (under 18) or any portrayal of a minor’s sexual parts for primarily sexual purposes.  
- **Child Sexual Exploitation (CSE):**  
  Situations where a child is coerced, manipulated, or deceived into sexual activities, including production of CSAM, prostitution, or trafficking.

---

## 3. Instance & Client‑Level Enforcement  
1. **Third‑Party Client:**  
   Blrop does not store or moderate content itself—moderation is performed by each Lemmy instance you connect to.  
2. **Reporting Requirements:**  
   - **Users:** Tap the “🚩 Report” button on any post or comment you suspect violates CSAE standards; reports go directly to the instance’s moderators.  
   - **Developer:** If you’re unable to report via the instance, email **support@blorpblorp.xyz** with links or screenshots—I will forward your report to the appropriate moderators or authorities.  
3. **Blocking Non‑Compliant Instances:**  
   If an instance fails to enforce basic CSAE policies, I may blacklist that instance in a future app update to protect users.

---

## 4. Reporting Mechanisms  
- **In‑App “Report” Button:** Directs the report to the instance administrators.  
- **Email Reports:** Send detailed reports (URLs, screenshots) to **support@blorpblorp.xyz**. Expect an acknowledgment within 24 hours.

---

## 5. Legal Compliance  
- **Assistance to Authorities:** I will cooperate fully with law enforcement or child protection agencies by providing logs or metadata if legally required.  
- **Data Handling:** Blrop does not store user media or personal data beyond minimal logs (timestamps, user‑agent) needed to process reports.

---

## 6. Contact & Updates  
- **Email:** support@blorpblorp.xyz
- **Last Updated:** April 18, 2025

> _This policy may be updated occasionally. Please revisit this page for the latest version._  
`;

export default function CSAE() {
  return (
    <Page>
      <PageTitle>Privacy</PageTitle>
      <IonHeader>
        <IonToolbar>
          <IonTitle>CSAE</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <ContentGutters>
          <MarkdownRenderer markdown={POLICY} className="flex-1 py-8" />
        </ContentGutters>
      </IonContent>
    </Page>
  );
}
