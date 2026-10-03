export const WHATSAPP_API_BASE_URL = 'https://graph.facebook.com';
export const DEFAULT_WHATSAPP_API_VERSION = 'v21.0';

export enum WhatsAppMessageCategory {
  UTILITY = 'UTILITY',
  MARKETING = 'MARKETING',
  AUTHENTICATION = 'AUTHENTICATION',
}

export enum WhatsAppQualityRating {
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  RED = 'RED',
  UNKNOWN = 'UNKNOWN',
}

export enum WhatsAppCodeVerificationStatus {
  VERIFIED = 'VERIFIED',
  NOT_VERIFIED = 'NOT_VERIFIED',
  EXPIRED = 'EXPIRED',
}

export const WHATSAPP_TEMPLATES = {
  AGENCY_NEW_ENQUIRY_ALERT: 'agency_new_enquiry_alert',
  CUSTOMER_ENQUIRY_ACKNOWLEDGEMENT: 'customer_enquiry_acknowledgement',
  STAFF_INVITE_CODE: 'staff_invite_code',
  CAREGIVER_ASSIGNMENT_NOTICE: 'caregiver_assignment_notice',
  REPLACEMENT_SLA_ESCALATION: 'replacement_sla_escalation',
  POST_ASSIGNMENT_FEEDBACK_REQUEST: 'post_assignment_feedback_request',
} as const;

/**
 * Pre-defined Healthcare Utility Templates designed for Meta App Review.
 * Uses official WhatsApp Business Management API format.
 */
export const STANDARD_HEALTHCARE_TEMPLATES = [
  {
    name: WHATSAPP_TEMPLATES.AGENCY_NEW_ENQUIRY_ALERT,
    category: WhatsAppMessageCategory.UTILITY,
    language: 'en_US',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'New Caregiver Request — {{1}}',
        example: {
          header_text: ['Ernakulam (Kochi)'],
        },
      },
      {
        type: 'BODY',
        text: 'Hello Agency Coordinator, a new care request has been received on your portal.\n\n• Ref Code: {{1}}\n• Patient: {{2}}\n• Service: {{3}}\n• Duration: {{4}}\n• Contact: {{5}} ({{6}})\n\nPlease review and match a certified caregiver within 60 minutes.',
        example: {
          body_text: [
            [
              'REQ-2026-894102',
              'Mary Varghese',
              'Elderly Daily Assistance',
              '24 Hours Live-In',
              'Dr. Thomas Varghese',
              '+91 98470 12345',
            ],
          ],
        },
      },
      {
        type: 'FOOTER',
        text: 'Caregiver Agency Platform — Immediate SLA Alert',
      },
    ],
  },
  {
    name: WHATSAPP_TEMPLATES.CUSTOMER_ENQUIRY_ACKNOWLEDGEMENT,
    category: WhatsAppMessageCategory.UTILITY,
    language: 'en_US',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Care Request Received — {{1}}',
        example: {
          header_text: ['CareKerala Agency'],
        },
      },
      {
        type: 'BODY',
        text: 'Dear {{1}},\n\nThank you for choosing {{2}}. We have received your caregiver request (Ref: {{3}}) for patient {{4}} in {{5}}.\n\nOur nurse coordinator is reviewing your requirement and will contact you via WhatsApp / phone within 60 minutes with verified caregiver profiles.\n\nHelpline: {{6}}',
        example: {
          body_text: [
            [
              'Dr. Thomas Varghese',
              'CareKerala Agency',
              'REQ-2026-894102',
              'Mary Varghese',
              'Ernakulam',
              '+91 98765 43210',
            ],
          ],
        },
      },
    ],
  },
  {
    name: WHATSAPP_TEMPLATES.STAFF_INVITE_CODE,
    category: WhatsAppMessageCategory.AUTHENTICATION,
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'You have been invited to join {{1}} as {{2}} on the Caregiver Agency Platform.\n\nYour single-use activation code is {{3}}. This code expires in 48 hours.\n\nLog in here: {{4}}',
        example: {
          body_text: [
            [
              'CareKerala Agency',
              'Office Staff Coordinator',
              'INV-9821-X',
              'https://agency.caregiver.com/login',
            ],
          ],
        },
      },
    ],
  },
  {
    name: WHATSAPP_TEMPLATES.REPLACEMENT_SLA_ESCALATION,
    category: WhatsAppMessageCategory.UTILITY,
    language: 'en_US',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'URGENT: Caregiver Replacement SLA Escalation',
      },
      {
        type: 'BODY',
        text: 'Attention Agency Owner:\n\nCaregiver assignment for patient {{1}} in {{2}} requires immediate replacement due to: {{3}}.\n\nThe SLA resolution window has breached {{4}} minutes. Please log in to dispatch an emergency backup caregiver from your standby roster.',
        example: {
          body_text: [
            [
              'George Mathew',
              'Thrissur',
              'Emergency Medical Leave',
              '60',
            ],
          ],
        },
      },
    ],
  },
  {
    name: WHATSAPP_TEMPLATES.POST_ASSIGNMENT_FEEDBACK_REQUEST,
    category: WhatsAppMessageCategory.UTILITY,
    language: 'en_US',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Care Service Completed — {{1}}',
        example: {
          header_text: ['CareKerala Healthcare Network'],
        },
      },
      {
        type: 'BODY',
        text: 'Dear {{1}},\n\nYour care assignment with {{2}} for patient {{3}} provided by caregiver {{4}} has concluded.\n\nWe would appreciate it if you could rate your experience with {{4}} from 1 to 5 stars. You can reply directly with your rating (e.g. "5 - Excellent care") or use the link below:\n\n{{5}}\n\nYour feedback helps us maintain the highest quality of healthcare for families across Kerala.',
        example: {
          body_text: [
            [
              'Dr. Thomas Varghese',
              'CareKerala Agency',
              'Mary Varghese',
              'Priya Lakshmi',
              'https://agency.caregiver.com/feedback/asgn-12345',
            ],
          ],
        },
      },
      {
        type: 'FOOTER',
        text: 'Caregiver Agency Platform — Quality & Care Assurance',
      },
    ],
  },
];
