import { Component, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';

// Static counter to track instances
let componentInstanceCounter = 0;

@Component({
  selector: 'app-landing',
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  animations: [
    trigger('accordionAnimation', [
      state('collapsed', style({
        height: '0px',
        overflow: 'hidden',
        opacity: 0
      })),
      state('expanded', style({
        height: '*',
        overflow: 'visible',
        opacity: 1
      })),
      transition('collapsed <=> expanded', [
        animate('300ms ease-in-out')
      ])
    ])
  ]
})
export class LandingComponent {
  activeTab = 'text';
  private isBrowser: boolean;
  private instanceId: number;
  
  // Mobile menu state
  isMobileMenuOpen = false;
  openSubMenus: Set<number> = new Set();

  // Accordion state - only one accordion can be active at a time
  activeAccordionId: number | null = 0; // First accordion is active by default

  // FAQ Data
  faqItems = [
    {
      id: 0,
      question: 'كيف يتم اشعاري بوصول السائق؟',
      answer: 'يرسل التطبيق تنبيه إلى جوالك عند اقتراب السائق، وعند وصوله يرن الهاتف دون معرفة السائق برقم هاتف المشتركة.'
    },
    {
      id: 1,
      question: 'كيف يتم التعامل مع الشكاوى؟',
      answer: 'يتم تصنيف الشكوى حسب درجتها، ولكل درجة إجراءات خاصة تتراوح بين التنبيه والفصل.'
    },
    {
      id: 2,
      question: 'ماذا يحدث لرصيدي في حال اعتذاري عن فصل دراسي؟',
      answer: 'سيبقى رصيدك محفوظ داخل التطبيق ويمكنك استعماله في الفصل القادم.'
    },
    {
      id: 3,
      question: 'ما الذي يميزكم عن شركات النقل التعليمي الأخرى؟',
      answer: 'ينقل موري المشتركات من مواقع متقاربة حتى يقلل من الوقت المستغرق للوصول إلى الجامعة، كما أن الطالبة لن تضطر إلى إرسال موعد ذهابها يوميا إلى السائق أو الاتصال به.'
    },
    {
      id: 4,
      question: 'ماذا لو تم إلغاء المحاضرة وتغيرت مواعيد الجدول الدراسي؟',
      answer: 'قومي بطلب تغيير جدول (مؤقت) من خلال التطبيق واختاري يوم ووقت الرحلة المتوفرة وسيصلك رد السائق عند الموافقة على الرحلة ( هذا التغيير يُعتمد ليوم واحد فقط)'
    },
    {
      id: 5,
      question: 'هل يمكنني الدفع نقدًا (كاش)؟',
      answer: 'يتم الدفع عن عن طريق مدى - STC PAY - APPLE PAY'
    },
    {
      id: 6,
      question: 'هل يمكنني تغيير موقع المنزل؟',
      answer: 'نعم يمكنك ذلك بتقديم طلب تغيير الموقع وسيتم الموافقة عليه خلال 48 ساعة'
    },
    {
      id: 7,
      question: 'هل التطبيق مرخص من الهيئة العامة للنقل TAG؟',
      answer: 'نعم، تطبيق موري مرخص من الهيئة العامة للنقل TAG.'
    },
    {
      id: 8,
      question: 'ماذا لو كنت في الجامعة وتم إلغاء المحاضرة؟',
      answer: 'يمكن للطالبة حجز رحلة العودة مباشرة دون الحاجة لانتظار الموعد العودة المعتاد.'
    }
  ];

  tabs = [
    {
      id: 'uni',
      tabId: 'v-pills-home-tab',
      icon: 'muri-uni',
      title: 'رحلات قصيرة',
      subtitle: 'مميزات التطبيق',
      content: 'مواقع متقاربة ونقاط توقف أقل يعني وقت رحلة أقصر',
      image: 'assets/image/features-thumb-1.png'
    },
    {
      id: 'payment',
      tabId: 'v-pills-profile-tab',
      icon: 'muri-shield',
      title: 'دفع آمن',
      subtitle: 'مميزات التطبيق',
      content: 'بيانات مصرفية آمنة ورصيد محفوظ في حال الاعتذار عن الفصل الدراسي',
      image: 'assets/image/payment.png'
    },
    {
      id: 'buses',
      tabId: 'v-pills-messages-tab',
      icon: 'muri-bus',
      title: 'وسائل نقل مريحة',
      subtitle: 'مميزات التطبيق',
      content: 'بإمكانك اختيار حافلة أو سيارة لضمان راحتك',
      image: 'assets/image/buses.png'
    },
    {
      id: 'text',
      tabId: 'v-pills-settings-tab',
      icon: 'muri-star',
      title: 'مواعيد مناسبة',
      subtitle: 'مميزات التطبيق',
      content: 'مواعيد متعددة ومتوافقة مع الجدول الدراسي',
      image: 'assets/image/time.png'
    }
  ];

  // Navigation menu items with sub-menus
  menuItems = [
    {
      title: 'الرئيسية',
      href: '/',
      hasSubMenu: false
    },
    {
      title: 'حول موري',
      href: '#service',
      hasSubMenu: false
    },
    {
      title: 'الميزات',
      href: '#features',
      hasSubMenu: false
    },
    {
      title: 'الاسئلة الشائعة',
      href: '#questions',
      hasSubMenu: false
    },
    {
      title: 'من نحن؟',
      href: 'muriapp.html',
      hasSubMenu: false
    }
  ];

  constructor(
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.instanceId = componentInstanceCounter;
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    console.log(`💀 Instance #${this.instanceId} destroyed`);
  }

  setActiveTab(tabId: string): void {
    console.log(`🚀 Instance #${this.instanceId} - Button clicked: ${tabId}`);
    this.activeTab = tabId;
  }

  isActive(tabId: string): boolean {
    return this.activeTab === tabId;
  }

  testClick(): void {
    console.log(`🚀 Instance #${this.instanceId} - Test button clicked`);
    if (this.isBrowser) {
      alert(`Instance #${this.instanceId} - Test button works!`);
    }
  }

  // Accordion methods
  toggleAccordion(accordionId: number): void {
    // If clicking the already active accordion, close it
    if (this.activeAccordionId === accordionId) {
      this.activeAccordionId = null;
    } else {
      // Otherwise, set this accordion as the active one (closes others)
      this.activeAccordionId = accordionId;
    }
  }

  isAccordionActive(accordionId: number): boolean {
    return this.activeAccordionId === accordionId;
  }

  getAccordionState(accordionId: number): string {
    return this.isAccordionActive(accordionId) ? 'expanded' : 'collapsed';
  }

  // Mobile menu methods
  openMobileMenu(): void {
    this.isMobileMenuOpen = true;
    if (this.isBrowser) {
      document.body.style.overflow = 'hidden'; // Prevent body scrolling when menu is open
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    this.openSubMenus.clear(); // Close all sub-menus when closing main menu
    if (this.isBrowser) {
      document.body.style.overflow = ''; // Restore body scrolling
    }
  }

  toggleSubMenu(index: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (this.openSubMenus.has(index)) {
      this.openSubMenus.delete(index);
    } else {
      this.openSubMenus.add(index);
    }
  }

  isSubMenuOpen(index: number): boolean {
    return this.openSubMenus.has(index);
  }

  onOverlayClick(event: Event): void {
    // Only close if clicking on the overlay itself, not its children
    if (event.target === event.currentTarget) {
      this.closeMobileMenu();
    }
  }
}