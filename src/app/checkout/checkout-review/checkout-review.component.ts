import { CdkStepper } from '@angular/cdk/stepper';
import { Component, Input, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { BasketService } from 'src/app/basket/basket.service';
import { IBasket } from 'src/app/shared/models/basket';
import { HttpClient } from '@angular/common/http';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-checkout-review',
  templateUrl: './checkout-review.component.html',
  styleUrls: ['./checkout-review.component.scss']
})
export class CheckoutReviewComponent implements OnInit {
  @Input() appStepper: CdkStepper;
  basket$: Observable<IBasket>;
  timeLeft: number = 120; // 2 minutes in seconds
  interval: any;
  Math = Math;

  constructor(
    private basketService: BasketService,
    private toastr: ToastrService,
    private http: HttpClient,
    private modalService: NgbModal
  ) { }

  ngOnInit(): void {
    this.basket$ = this.basketService.basket$;
  }

  createPaymentIntent() {
    return this.basketService.createPaymentIntent().subscribe(
      (response: any) => {
        this.appStepper.next();
      },
      error => {
        console.log(error);
      }
    );
  }

  payWithJustPay(content: any) {
    this.basket$.subscribe(basket => {
      if (!basket?.id) {
        this.toastr.error('Basket not found');
        return;
      }

      // Call your own backend API to create the reference number
      this.http.get(`https://localhost:5001/api/Payments/billing/${basket.id}`)
        .subscribe(
          (response: any) => {
            console.log('Reference Number Created:', response);

            // Show the modal and start the timer
            const modalRef = this.modalService.open(content, { centered: true });

            this.timeLeft = 120;
            this.interval = setInterval(() => {
              if (this.timeLeft > 0) {
                this.timeLeft--;
              } else {
                clearInterval(this.interval);
                modalRef.close();
                this.toastr.warning('Payment time expired');
              }
            }, 1000);

            modalRef.result.then(
              () => clearInterval(this.interval),
              () => clearInterval(this.interval)
            );
          },
          error => {
            console.error('Backend Error:', error);
            this.toastr.error('Failed to connect to backend');
          }
        );
    });
  }
}
