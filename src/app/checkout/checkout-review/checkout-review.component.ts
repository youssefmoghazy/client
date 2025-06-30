import { CdkStepper } from '@angular/cdk/stepper';
import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { BasketService } from 'src/app/basket/basket.service';
import { IBasket } from 'src/app/shared/models/basket';
import { HttpClient } from '@angular/common/http';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-checkout-review',
  templateUrl: './checkout-review.component.html',
  styleUrls: ['./checkout-review.component.scss']
})
export class CheckoutReviewComponent implements OnInit {
  @Input() appStepper: CdkStepper;
  @Input() checkoutForm: FormGroup;
  basket$: Observable<IBasket>;
  timeLeft: number = 120; // 2 minutes in seconds
  interval: any;
  Math = Math;
  referenceNumber: string = '';
  copied: boolean = false;
  baseUrl = environment.apiUrl;

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

      // First create an order
      const orderToCreate = {
        basketId: basket.id,
        deliveryMethodId: +this.checkoutForm.get('deliveryForm').get('deliveryMethod').value,
        shipToAddress: this.checkoutForm.get('addressForm').value
      };

      // Create order and then get billing reference
      this.http.post(`${this.baseUrl}orders`, orderToCreate).subscribe(
        (orderResponse: any) => {
          // Now get the billing reference using both basket ID and order ID
          this.http.get(`${this.baseUrl}Payments/billing/${basket.id}/${orderResponse.id}`)
            .subscribe(
              (response: any) => {
                console.log('Billing response:', response);
                // Extract the reference number from the response
                this.referenceNumber = response.referenceNumber || response['Reference Number'] || 'N/A';
                this.copied = false;

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
                console.error('Error getting reference number:', error);
                this.toastr.error('Failed to connect to backend');
              }
            );
        },
        error => {
          console.error('Error creating order:', error);
          this.toastr.error('Failed to create order');
        }
      );
    });
  }

  copyReferenceNumber() {
    navigator.clipboard.writeText(this.referenceNumber).then(() => {
      this.copied = true;
      this.toastr.success('Reference number copied to clipboard');
      setTimeout(() => (this.copied = false), 3000);
    }).catch(() => {
      this.toastr.error('Could not copy reference number');
    });
  }
}
