import { ContentGutters } from "@/src/components/gutters";
import { MarkdownRenderer } from "../components/markdown/renderer";
import { IonContent, IonHeader, IonTitle, IonToolbar } from "@ionic/react";
import { PageTitle } from "../components/page-title";
import { Page } from "../components/page";

const TERMS = `
**Terms of Use for Blorp**  
_Last updated: April 29, 2025_

By using Blorp (“App”), a Lemmy-compatible client for iOS and other platforms maintained by the developer (“I,” “me,” or “Developer”), you agree to these Terms of Use (“Terms”). Please read them carefully.

---

## 1. User-Generated Content and Responsible Engagement  
**1.1 Access to Content.**  
Blorp provides access to user-generated content hosted on Lemmy instances (“Servers”). You may browse, create, comment on, and share posts in any community to which you have access.  

**1.2 Responsible Conduct.**  
All users must engage respectfully. You may not post or facilitate any content that is unlawful, harassing, hateful, obscene, defamatory, or otherwise objectionable. Each Server you connect to has its own rules—familiarize yourself with them before posting.

---

## 2. Blocking and Reporting Functionality  
**2.1 Blocking.**  
You can block individual users or entire communities via the App’s block feature to curate your personal feed.  

**2.2 Reporting.**  
The App includes an in-App report button on every post and comment. Reports are forwarded directly to the moderation team of the Server where the content resides.

---

## 3. User Responsibility and Content Moderation  
**3.1 Server-Side Moderation.**  
All moderation (content removal, user bans/suspensions) is performed by each Lemmy Server’s administrators and moderators. Blorp merely provides the interface.  

**3.2 Indemnification.**  
You agree to indemnify and hold harmless Blorp’s contributors and maintainers from any claims arising out of your use of the App or violation of these Terms.

---

## 4. Child Safety Standards  
**4.1 Zero Tolerance for CSAE.**  
Blorp expressly prohibits any form of Child Sexual Abuse and Exploitation (“CSAE”).  

**4.2 Reporting CSAE.**  
You may report CSAE or other violations either in-App or via email at **support@blorpblorp.xyz**.  

**4.3 Legal Compliance.**  
Blorp complies with applicable child protection laws, including mandatory reporting of confirmed CSAE to authorities (e.g., National Center for Missing & Exploited Children in the U.S.).  

**4.4 Designated Contact.**  
For CSAE-related inquiries, contact the Developer at **support@blorpblorp.xyz**.

---

## 5. NSFW Content  
**5.1 Logged-In Access Only.**  
NSFW content is visible only to users logged into their Lemmy Server account.  

**5.2 Server-Controlled Settings.**  
Enabling or disabling NSFW content is done through your profile settings on the Server’s website; the App does not provide its own toggle.  

**5.3 Clear Tagging.**  
All content flagged as NSFW by the Server is labeled with an “NSFW” tag in the App.

---

## 6. Intellectual Property  
**6.1 App License.**  
The App’s source code and graphics are owned by me and licensed under the MIT License.  

**6.2 Your Content.**  
You retain ownership of content you post to any Server. By posting, you grant the Server (and its downstream users) a license to host, display, and distribute it.

---

## 7. Termination  
**7.1 By You.**  
You may delete the App from your device at any time; account deletion must be performed on the Server.  

**7.2 By Developer.**  
I may remove or disable access to the App for users who violate these Terms, with notice where feasible.

---

## 8. Disclaimers & Limitation of Liability  
Blorp is provided **“as-is”** without warranties. To the fullest extent permitted by law, my total liability to you for any claim arising out of these Terms is limited to US $50.

---

## 9. Governing Law  
These Terms are governed by the laws of the State of New Jersey, USA. Any dispute will be resolved exclusively in the state or federal courts located in New Jersey.

---

**Contact & Support**  
For support, bug reports, or feature requests, email **support@blorpblorp.xyz**.  

_By using Blorp, you acknowledge that you have read, understood, and agree to these Terms of Use._
`;

export default function Privacy() {
  return (
    <Page>
      <PageTitle>Terms of Use</PageTitle>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Terms of Use</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <ContentGutters>
          <MarkdownRenderer markdown={TERMS} className="flex-1 py-8" />
        </ContentGutters>
      </IonContent>
    </Page>
  );
}
