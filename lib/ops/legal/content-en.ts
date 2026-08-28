import type { LegalDocument } from './content';
import { LEGAL_DOCS_VERSION } from './version';

const CONTACT_EMAIL = 'hello@codiva.dev';
const DOMICILIO =
  'Goldsmith número 40, colonia Polanco III Sección, Alcaldía Miguel Hidalgo, Mexico City, postal code 11550';
const UPDATED = 'August 11, 2026';

export const TERMS_OF_USE_EN: LegalDocument = {
  title: 'Terms and Conditions of Use',
  versionCode: LEGAL_DOCS_VERSION,
  updated: UPDATED,
  intro: [
    `This website and the digital services of Codiva.dev (the “Site”, the “Platform”, or the “Portal”) are operated by Codiva (“we”, “our”, or the “Controller”), with address at ${DOMICILIO}. Contact email for legal and privacy matters: ${CONTACT_EMAIL}.`,
    'These Terms are governed by the principles of autonomy of will and freedom of contract recognized by articles 6, 7, and 78 of the Mexican Federal Consumer Protection Law (LFPC), and articles 1793 and 1794 of the Federal Civil Code (CCF).',
  ],
  introLegalNote:
    'Acceptance of these Terms, the Privacy Notice and, where applicable, the project NDA is a condition for using the client Portal.',
  sections: [
    {
      id: 'definitions',
      title: '1. Definitions',
      lead: 'For these Terms:',
      items: [
        'Platform / Portal: Codiva’s website, apps, and digital tools (ops.codiva.dev for the Codiva team; portal.codiva.dev for clients, or other domains we indicate).',
        'User: any natural person who accesses, registers, or uses the Platform, including client collaborators invited to a project.',
        'Client: the legal or natural person contracting or prospecting with whom Codiva negotiates or executes a project.',
        'Project: the Portal space associated with a client organization, where multiple Users may participate with different roles.',
        'Services: custom software development, digital products, technical consulting, quotes, document delivery, and Portal features.',
      ],
    },
    {
      id: 'acceptance',
      title: '2. Express acceptance',
      body: 'Access to and use of the Portal implies express and unequivocal acceptance of these Terms, the Privacy Notice and, for projects that require it, the Non-Disclosure Agreement (NDA). If you do not agree, you must refrain from using the Portal.',
      legalNote:
        'Article 1803 of the Federal Civil Code: an offer addressed to the public binds the offeror toward whoever accepts the stated conditions.',
    },
    {
      id: 'capacity',
      title: '3. Legal capacity',
      body: 'By using the Platform you represent that you have sufficient legal capacity under Mexican law (18 years or older and not legally incapacitated). If you act on behalf of a legal entity, you represent that you have authority to bind it.',
    },
    {
      id: 'modifications',
      title: '4. Modifications',
      body: 'We may modify these Terms to reflect legal changes, new services, or better practices. Changes take effect when published. For material changes we will ask for a new acceptance in the Portal or notify you through registered contact channels. Continued use after accepting the new version constitutes acceptance.',
    },
    {
      id: 'service',
      title: '5. Description of the service',
      body: 'Codiva offers custom software design and development, digital products and integrations, as well as a Portal to share quotes, architecture, documents, deliverables, and project follow-up. Specific commercial scope is governed by the accepted quote, proposal, or contract. We may modify, suspend, or discontinue non-essential parts of the Portal, with reasonable notice when it affects the Client.',
    },
    {
      id: 'account',
      title: '6. Registration and account',
      lead: 'To access the Portal an account may be created or invited. You agree to:',
      items: [
        'Provide truthful, accurate, current, and complete information.',
        'Keep your password and account activity confidential.',
        'Notify us immediately of any unauthorized use or security incident.',
        'Be responsible for activity carried out with your credentials.',
      ],
      closing:
        'We may suspend or cancel an account if these Terms are violated or we detect abuse, fraud, or a security risk.',
    },
    {
      id: 'multiuser',
      title: '7. Multiple users per project',
      body: 'The same Project may have several invited Users (for example stakeholders, legal, or operations). Each User must individually accept the applicable Terms, Privacy Notice, and NDA on first access. A User’s actions (accepting a quote, uploading documents, creating tickets) may be attributed to the Client organization according to the assigned role.',
    },
    {
      id: 'obligations',
      title: '8. Obligations and conduct',
      lead: 'The User agrees to use the Platform lawfully and in accordance with these Terms. In particular, it is prohibited to:',
      items: [
        'Use the Platform for unlawful purposes or in ways that infringe third-party rights.',
        'Infringe intellectual property rights of Codiva or third parties.',
        'Resell or commercialize Portal access without authorization.',
        'Upload defamatory or unlawful content or malware.',
        'Attempt to access other clients’ data or bypass security controls.',
        'Impersonate another person or entity.',
      ],
    },
    {
      id: 'confidentiality',
      title: '9. Confidentiality and NDA',
      body: 'Commercial, technical, and project information shared in the Portal is treated as confidential. When the Project includes an NDA, acceptance in the Portal complements - and does not replace - any separately signed agreement. The User agrees not to disclose Confidential Information outside the need-to-know circle of their organization.',
    },
    {
      id: 'ip',
      title: '10. Intellectual property',
      body: 'Rights in the Platform, its code, design, trademarks, and Codiva materials belong to Codiva or its licensors. Portal access does not transfer IP. Ownership of the Client’s software deliverables is governed by the corresponding quote or services contract.',
    },
    {
      id: 'security',
      title: '11. Security',
      body: 'We implement reasonable technical and organizational measures to protect Portal information (access control, encryption in transit, private file storage, and relevant activity logs). No system is infallible; the User must also protect their credentials and devices.',
      legalNote: 'Article 19 of the LFPDPPP.',
    },
    {
      id: 'ai',
      title: '12. AI-assisted tools',
      body: 'Codiva may use automated or AI tools in an assistive way (for example, documentation support or internal operations). These processes do not replace legal opinions or binding contractual decisions without human review when required.',
    },
    {
      id: 'liability',
      title: '13. Limitation of liability',
      lead: 'To the maximum extent permitted by applicable law, the Portal is provided “as is” and “as available”. Codiva will not be liable for:',
      items: [
        'Indirect, incidental, or consequential damages arising from use or inability to use the Portal.',
        'Interruptions, technical failures, data loss, or errors in third-party content.',
        'Client business decisions based solely on discovery or quote materials without a signed contract.',
      ],
      closing:
        'Development obligations and commercial warranties are governed by the accepted Project contract or quote.',
    },
    {
      id: 'indemnity',
      title: '14. Indemnity',
      lead: 'The User agrees to hold Codiva harmless from claims arising from:',
      items: [
        'Misuse of the Portal.',
        'Breach of these Terms or the NDA.',
        'Content they upload that infringes third-party rights.',
      ],
    },
    {
      id: 'links',
      title: '15. Third-party links',
      body: 'The Portal may include links to third-party sites. Codiva does not control and is not responsible for their content or privacy policies. Access is at your own risk.',
    },
    {
      id: 'law',
      title: '16. Governing law and jurisdiction',
      body: 'These Terms are governed by the laws of the United Mexican States. For disputes, the parties submit to the competent courts of Mexico City, waiving any other venue that may correspond by reason of domicile.',
    },
    {
      id: 'partyRelation',
      title: '17. Relationship of the parties',
      body: 'Use of the Portal does not create an employment, partnership, agency, or exclusive representation relationship, except as agreed in a services contract.',
    },
    {
      id: 'assignment',
      title: '18. Assignment',
      body: 'Codiva may assign rights or obligations under these Terms to affiliates or acquirers of the business without prior User authorization. The User may not assign their account without written consent.',
    },
    {
      id: 'severability',
      title: '19. Severability',
      body: 'If any provision is declared void or unenforceable, the remaining provisions continue in force.',
    },
  ],
};

export const PRIVACY_NOTICE_EN: LegalDocument = {
  title: 'Privacy Notice',
  versionCode: LEGAL_DOCS_VERSION,
  updated: UPDATED,
  intro: [
    'Pursuant to the Mexican Federal Law on Protection of Personal Data Held by Private Parties (LFPDPPP) and its Regulations, we make the following privacy notice available to you.',
    `Data controller: Codiva.dev, with address at ${DOMICILIO}. Contact email for privacy and ARCO rights: ${CONTACT_EMAIL}.`,
  ],
  introLegalNote: 'Articles 1 through 100 of the LFPDPPP.',
  sections: [
    {
      id: 'data',
      title: '1. Personal data collected',
      lead: 'We may collect, directly or through providers, the following data:',
      groups: [
        {
          title: 'Identification and contact',
          items: [
            'Name, email, phone, company, role, and billing data when applicable.',
          ],
        },
        {
          title: 'Account and access',
          items: [
            'Credentials (password encrypted by the authentication provider), project role, access logs, and Portal activity.',
          ],
        },
        {
          title: 'Project and documentation',
          items: [
            'Quotes, tickets, messages, uploaded files (contracts, NDA, evidence), and associated metadata.',
          ],
        },
        {
          title: 'Technical',
          items: [
            'IP address, browser type, security logs, and necessary session cookies.',
          ],
        },
      ],
    },
    {
      id: 'purposes',
      title: '2. Purposes of processing',
      lead: 'Primary purposes (necessary for the service):',
      items: [
        'Create and manage accounts and project invitations.',
        'Operate the Portal (quotes, documents, deliverables, tickets, legal acceptances).',
        'Communicate progress, proposals, and support related to the project.',
        'Comply with contractual, tax, and security obligations.',
      ],
      closing:
        'Secondary purposes (optional): send commercial communications about Codiva services. You may object at any time by writing to ' +
        CONTACT_EMAIL +
        '.',
    },
    {
      id: 'automated',
      title: '3. Automated processing and AI',
      body: 'We may use automated or AI tools in an assistive way for internal operations (for example, drafting or classification). We do not make binding legal or contractual decisions based solely on automated means without human review when the law or context requires it.',
    },
    {
      id: 'security',
      title: '4. Security measures',
      body: 'We apply reasonable security measures: authentication, per-project access control, private file storage, encryption in transit (TLS), and industry-standard providers. Client Portal access is limited to invited members and authorized Codiva staff.',
    },
    {
      id: 'subprocessors',
      title: '5. Processors and subprocessors',
      lead: 'Relevant providers that may process data on Codiva’s behalf to operate the service:',
      items: [
        'Vercel - hosting and edge.',
        'Supabase - database, authentication, and storage.',
        'Resend - transactional email.',
        'Stripe - payments, when the project uses it.',
      ],
      closing:
        'Each provider applies its own measures. Codiva remains the controller vis-à-vis the data subject for the purposes it determines.',
    },
    {
      id: 'cookies',
      title: '6. Cookies and similar technologies',
      body: 'We use cookies and similar technologies necessary for session, security, and preferences. You may configure your browser to block them; some Portal features may stop working.',
    },
    {
      id: 'transfers',
      title: '7. Transfers',
      body: 'Data may be processed inside or outside Mexico by cloud and email providers that support our operations, bound by confidentiality and contractual security. We do not sell personal data.',
    },
    {
      id: 'arco',
      title: '8. ARCO rights',
      body: 'You may access, rectify, cancel, or object to the processing of your personal data (“ARCO rights”), and revoke consent when applicable, under the LFPDPPP.',
    },
    {
      id: 'procedure',
      title: '9. ARCO procedure',
      items: [
        `Send your request to ${CONTACT_EMAIL} proving identity and clearly describing the right you wish to exercise.`,
        'We will respond within 20 business days; if granted, it will be effected within 15 additional business days, or we will inform you of the reason for denial.',
      ],
    },
    {
      id: 'revocation',
      title: '10. Revocation of consent',
      body: 'You may revoke consent for processing that requires it. Revocation will not affect processing necessary to perform the contractual relationship or comply with legal obligations.',
    },
    {
      id: 'limiting',
      title: '11. Limitation of use or disclosure',
      body:
        'You may register in Profeco’s Public Registry to Avoid Advertising (REPEP). To limit Codiva’s use of your data, exercise your ARCO rights or write to ' +
        CONTACT_EMAIL +
        '.',
    },
    {
      id: 'changes',
      title: '12. Changes to this notice',
      body: 'We may modify this notice. Changes will be published with a new version. If the change is material, a new acceptance will be requested in the Portal or you will be notified by email.',
    },
    {
      id: 'contact',
      title: '13. Contact',
      items: [
        `General and data-protection email: ${CONTACT_EMAIL}`,
        `Address: ${DOMICILIO}`,
        'Brand: Codiva.dev - custom software and digital products.',
      ],
    },
  ],
};

export const PORTAL_NDA_EN: LegalDocument = {
  title: 'Non-Disclosure Agreement (NDA) - Project portal',
  versionCode: LEGAL_DOCS_VERSION,
  updated: UPDATED,
  intro: [
    'This Non-Disclosure Agreement applies to access to the project Portal between Codiva and the Client organization (and its invited Users). Express digital acceptance in the Portal (clickwrap) constitutes valid consent for these purposes; it does not replace a notarized NDA or advanced electronic signature when the parties agree that separately.',
    `Codiva, with address at ${DOMICILIO}. Contact: ${CONTACT_EMAIL}.`,
  ],
  sections: [
    {
      id: 'object',
      title: '1. Purpose',
      body: 'The parties will share Confidential Information to evaluate, negotiate, or execute the Project shown in the Portal (quotes, architecture, documents, deliverables, and related communications). This Agreement exclusively governs the exchange of Confidential Information and does not constitute an offer, promise, commitment, or obligation to enter into any contract, develop the Project, or continue negotiations.',
    },
    {
      id: 'confidential',
      title: '2. Confidential Information',
      body: 'Includes technical, commercial, financial, product, architecture, code, unit economics, credentials, documentation, and any material marked confidential or that by its nature should be treated as such. Confidential Information also includes any analysis, compilation, summary, report, development, test, prototype, or document prepared by the Receiving Party that incorporates, reproduces, derives from, or discloses Confidential Information of the Disclosing Party.',
    },
    {
      id: 'obligations',
      title: '3. Obligations',
      items: [
        'Use Confidential Information only to evaluate or execute the Project.',
        'Not disclose it to third parties without written authorization, except advisors under an equivalent duty of confidentiality.',
        'Apply at least the same care as with its own sensitive information.',
        'Limit access to people with a need to know within its organization.',
        'Not copy, reproduce, modify, decompile, reverse-engineer, or use Confidential Information for purposes other than the Project, except as strictly necessary to evaluate or execute the Project or with prior written authorization.',
        'Not use Confidential Information to train artificial intelligence models, automated systems, or machine-learning tools without prior written authorization.',
        'Promptly notify the Disclosing Party of any unauthorized access, use, or disclosure of which it becomes aware.',
        'Adopt reasonably necessary administrative, physical, and technical measures to protect Confidential Information against unauthorized access.',
      ],
    },
    {
      id: 'exclusions',
      title: '4. Exclusions',
      body: 'Information is not confidential if it: (a) is or becomes public without breach; (b) was already lawfully in the Receiving Party’s possession; (c) is received from a third party without a duty of secrecy; or (d) must be disclosed by law or court order (with reasonable advance notice when legally permitted).',
    },
    {
      id: 'ip',
      title: '5. Intellectual property',
      body: 'Nothing in this NDA transfers Intellectual Property ownership. Development deliverables are governed by the quote or services contract. No provision shall be construed as an assignment, license, or authorization to use trademarks, copyrights, patents, trade secrets, software, developments, inventions, or other IP rights of either Party.',
    },
    {
      id: 'term',
      title: '6. Term',
      body: 'Confidentiality obligations will survive for 2 years from Portal acceptance, or for as long as Project negotiation/contract exists, whichever is later. Trade secrets remain protected while they retain that character.',
    },
    {
      id: 'breach',
      title: '7. Breach',
      body: 'The Parties acknowledge that unauthorized disclosure of Confidential Information may cause harm that is difficult to repair. The affected Party may seek injunctive or judicial relief under applicable law, without prejudice to other legal actions.',
    },
    {
      id: 'law',
      title: '8. Governing law',
      body: 'Laws of the United Mexican States. Jurisdiction: courts of Mexico City.',
    },
  ],
};
