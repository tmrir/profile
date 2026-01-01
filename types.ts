
export interface ServiceItem {
  id: string;
  title: string;
  points: string[];
}

export interface ContactInfo {
  email: string;
  phone: string;
  website: string;
  address: string;
  location: string;
  tiktok: string;
  snapchat: string;
  instagram: string;
  commercialRegistration: string;
}

export interface ProfileData {
  hero: {
    brandName: string;
    mainTitle: string;
    highlight: string;
    subtitle: string;
    footerText: string;
    logo?: string;
  };
  visionMission: {
    sectionTitle: string;
    visionTitle: string;
    visionText: string;
    missionTitle: string;
    missionText: string;
    year: string;
    mainImage?: string;
  };
  services: {
    sectionTitle: string;
    sectionSubtitle: string;
    items: ServiceItem[];
  };
  about: {
    sectionTitle: string;
    description: string;
    mainIcon?: string;
    floatingIcon1?: string;
    floatingIcon2?: string;
  };
  ceoMessage: {
    title: string;
    text: string;
    name: string;
    role: string;
    company: string;
  };
  values: {
    sectionTitle: string;
    items: { title: string; description: string }[];
  };
  contact: {
    sectionTitle: string;
    sectionSubtitle: string;
    email: string;
    phone: string;
    website: string;
    address: string;
    location: string;
    tiktok: string;
    snapchat: string;
    instagram: string;
    commercialRegistration: string;
    footerCopyright: string;
    footerLogo?: string;
    showFooter?: boolean;
    footerText?: string;
  };
  workProcess: {
    sectionTitle: string;
    sectionSubtitle: string;
    items: { title: string; points: string[] }[];
  };
}
