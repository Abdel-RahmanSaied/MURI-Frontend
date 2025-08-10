import { Component } from '@angular/core';
import { FooterComponent } from "../../../shared/footer/footer.component";
import { NavbarComponent } from "../../../shared/navbar/navbar.component";

@Component({
  selector: 'app-terms',
  imports: [NavbarComponent, FooterComponent],
  templateUrl: './terms.component.html',
  styleUrl: './terms.component.scss'
})
export class TermsComponent {

}
