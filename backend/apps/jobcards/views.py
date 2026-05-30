from datetime import timedelta
from django.db import transaction
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from .models import JobCard, JobCardService, JobCardEmployee, JobCardPayment, JobCardProduct, JobCardProductUsage
from apps.customers.models import Customer, CustomerAsset
from .serializers import (
    JobCardSerializer,
    JobCardServiceSerializer,
    JobCardEmployeeSerializer,
    JobCardPaymentSerializer,
    FullJobCardCreateSerializer,
    ProductInfoSerializer,
    ProductsUsedSerializer,
    InventoryOptionSerializer,
    JobCardProductUsageReadSerializer,
    JobCardProductUsageCreateSerializer,
)
from apps.services.models import ServiceProduct
from apps.vendors.models import Inventory


# ─── JobCard ──────────────────────────────────────────

class FullJobCardCreateView(APIView):
    def post(self, request):
        serializer = FullJobCardCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job_card = serializer.save()
        return Response(JobCardSerializer(job_card).data, status=status.HTTP_201_CREATED)


class JobCardListCreateView(APIView):
    def get(self, request):
        qs = JobCard.objects.all()
        job_status = request.query_params.get('status')
        date       = request.query_params.get('date')
        employee   = request.query_params.get('employee')
        company    = request.query_params.get('company')
        model      = request.query_params.get('model')
        vehicle_id = request.query_params.get('vehicle_id')
        if job_status:
            qs = qs.filter(job_card_status=job_status)
        if date:
            qs = qs.filter(job_card_date=date)
        if employee:
            qs = qs.filter(employee_id=employee)
        if company:
            qs = qs.filter(customer_asset__vehicle_company__icontains=company)
        if model:
            qs = qs.filter(customer_asset__vehicle_model__icontains=model)
        if vehicle_id:
            qs = qs.filter(customer_asset_id=vehicle_id)
        serializer = JobCardSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = JobCardSerializer(data=request.data)
        vehicle_number = serializer.vehicle_number
        customer_name = serializer.customer_name
        existing_vehicle = CustomerAsset.objects.filter(vehicle_number=vehicle_number).first()
        existing_customer = Customer.objects.filter(customer_name=customer_name).first()
        if existing_vehicle and serializer.is_valid():
            serializer.save(customer_asset=existing_vehicle)
            return Response(existing_vehicle, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class JobCardDetailView(APIView):
    def get_object(self, pk):
        try:
            return JobCard.objects.get(pk=pk)
        except JobCard.DoesNotExist:
            return None

    def get(self, request, pk):
        jobcard = self.get_object(pk)
        if not jobcard:
            return Response(
                {'error': 'Job card not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = JobCardSerializer(jobcard)
        return Response(serializer.data)

    def put(self, request, pk):
        jobcard = self.get_object(pk)

        if not jobcard:
            return Response(
                {'error': 'Job card not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        old_status = jobcard.job_card_status

        serializer = JobCardSerializer(jobcard, data=request.data, partial=True)
        if serializer.is_valid():
            updated_jobcard = serializer.save()
            print(serializer.data)

            if old_status != 'COMPLETED' and updated_jobcard.job_card_status == 'COMPLETED':
                updated_jobcard.vehicle_exit_time = timezone.now()
                updated_jobcard.save()
                vehicle = updated_jobcard.customer_asset
                updated_jobcard.job_card_services.update(service_status='completed')
                if vehicle:
                    today = timezone.now().date()
                    vehicle.last_service_date = today
                    vehicle.next_service_date = today + timedelta(days=183)  # ~6 months
                    vehicle.save(update_fields=['last_service_date', 'next_service_date'])

            return Response(JobCardSerializer(updated_jobcard).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        jobcard = self.get_object(pk)
        if not jobcard:
            return Response(
                {'error': 'Job card not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        jobcard.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── JobCard Service ──────────────────────────────────

class JobCardServiceListCreateView(APIView):
    def get(self, request, jobcard_pk):
        services = JobCardService.objects.filter(job_card_id=jobcard_pk)
        serializer = JobCardServiceSerializer(services, many=True)
        return Response(serializer.data)

    def post(self, request, jobcard_pk):
        try:
            jobcard = JobCard.objects.get(pk=jobcard_pk)
        except JobCard.DoesNotExist:
            return Response(
                {'error': 'Job card not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if jobcard.job_card_status == 'COMPLETED':
            return Response(
                {'error': 'Cannot add service to completed job card'},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = request.data.copy()
        data['job_card'] = jobcard.id

        # Auto set price_at_time from service's current price
        if 'price_at_time' not in data:
            try:
                from apps.services.models import Service
                service = Service.objects.get(pk=data['service'])
                data['price_at_time'] = service.service_price
            except Exception:
                pass

        serializer = JobCardServiceSerializer(data=data)
        if serializer.is_valid():
            jc_service = serializer.save()
            JobCardProduct.objects.bulk_create([
                JobCardProduct(job_card_service=jc_service, service_product=sp)
                for sp in ServiceProduct.objects.filter(service=jc_service.service)
            ])
            self.update_total_price(jobcard)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update_total_price(self, jobcard):
        total = sum(
            s.price_at_time for s in jobcard.job_card_services.all()
        )
        jobcard.total_price = total
        jobcard.save()


class JobCardServiceDeleteView(APIView):
    def patch(self, request, pk):
        try:
            jc_service = JobCardService.objects.get(pk=pk)
            print (jc_service.service_status)
        except JobCardService.DoesNotExist:
            return Response(
                {'error': 'Not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = JobCardServiceSerializer(jc_service, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)
    
    def delete(self, request, pk):
        try:
            jc_service = JobCardService.objects.get(pk=pk)
        except JobCardService.DoesNotExist:
            return Response(
                {'error': 'Not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        jobcard = jc_service.job_card
        jc_service.delete()
        total = sum(
            s.price_at_time for s in jobcard.job_card_services.all()
        )
        jobcard.total_price = total
        jobcard.save()
        return Response(status=status.HTTP_204_NO_CONTENT)




# ─── JobCard Employee ─────────────────────────────────

class JobCardEmployeeListCreateView(APIView):
    def get(self, request, jcservice_pk):
        employees = JobCardEmployee.objects.filter(
            job_card_service_id=jcservice_pk
        )
        serializer = JobCardEmployeeSerializer(employees, many=True)
        return Response(serializer.data)

    def post(self, request, jcservice_pk):
        try:
            jc_service = JobCardService.objects.get(pk=jcservice_pk)
        except JobCardService.DoesNotExist:
            return Response(
                {'error': 'Job card service not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        data = request.data.copy()
        data['job_card_service'] = jc_service.id
        serializer = JobCardEmployeeSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class JobCardEmployeeDeleteView(APIView):
    def delete(self, request, pk):
        try:
            jce = JobCardEmployee.objects.get(pk=pk)
        except JobCardEmployee.DoesNotExist:
            return Response(
                {'error': 'Not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        jce.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class FetchVehicleType(APIView):
    def get_object(self, vehicle_type):
        try:
            return JobCard.objects.filter(customer_asset__vehicle_type=vehicle_type)
        except JobCard.DoesNotExist:
            return None

    def get(self, request, vehicle_type):
        jobcards_count = self.get_object(vehicle_type).count()
        return Response({'vehicle_type': vehicle_type, 'count': jobcards_count})


# ─── JobCard Payments ─────────────────────────────────

class JobCardPaymentListCreateView(APIView):
    def get(self, request, jobcard_pk):
        try:
            jobcard = JobCard.objects.get(pk=jobcard_pk)
        except JobCard.DoesNotExist:
            return Response({'error': 'Job card not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = JobCardPaymentSerializer(jobcard.payments.all(), many=True)
        return Response(serializer.data)

    def post(self, request, jobcard_pk):
        try:
            jobcard = JobCard.objects.get(pk=jobcard_pk)
        except JobCard.DoesNotExist:
            return Response({'error': 'Job card not found'}, status=status.HTTP_404_NOT_FOUND)
        data = request.data.copy()
        data['job_card'] = jobcard.id
        serializer = JobCardPaymentSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class JobCardPaymentDeleteView(APIView):
    def delete(self, request, pk):
        try:
            payment = JobCardPayment.objects.get(pk=pk)
        except JobCardPayment.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        payment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class FetchVehicleTypeList(APIView):
    def get(self, request, vehicle_type):
        qs = JobCard.objects.filter(customer_asset__vehicle_type=vehicle_type)
        date     = request.query_params.get('date')
        company  = request.query_params.get('company')
        model    = request.query_params.get('model')
        employee = request.query_params.get('employee')
        if date:
            qs = qs.filter(job_card_date=date)
        if company:
            qs = qs.filter(customer_asset__vehicle_company__icontains=company)
        if model:
            qs = qs.filter(customer_asset__vehicle_model__icontains=model)
        if employee:
            qs = qs.filter(employee_id=employee)
        serializer = JobCardSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
class FetchProductsUsedForJobCard(APIView):
    def get_object(self, jobcard_pk):
        try:
            return JobCardService.objects.filter(job_card_id= jobcard_pk) # we get all the servieces for the job card and then we get all the products used for those services in the response 
        except JobCardService.DoesNotExist:
            return None
    def get(self, request, jobcard_pk):
        jobcard_services = self.get_object(jobcard_pk) # contains all the services for that job card
        serializer = ProductsUsedSerializer(jobcard_services, many=True) # we use the ProductsUsedSerializer to get the products used for each service in the job card

        return Response(serializer.data , status=status.HTTP_200_OK)


# ─── JobCardProduct: inventory options + usage records ──────

class JobCardProductInventoryOptionsView(APIView):
    """GET inventory rows the worker can pick from for this planned product."""

    def get(self, request, jc_product_id):
        try:
            jc_product = JobCardProduct.objects.select_related('service_product__product').get(pk=jc_product_id)
        except JobCardProduct.DoesNotExist:
            return Response({'error': 'JobCardProduct not found'}, status=status.HTTP_404_NOT_FOUND)

        inventory_rows = Inventory.objects.filter(
            product=jc_product.service_product.product
        ).select_related('product').order_by('brand', 'unit_amount')

        return Response(InventoryOptionSerializer(inventory_rows, many=True).data)


class JobCardProductUsageListCreateView(APIView):
    """GET existing usages for this planned product; POST a new usage (decrements inventory)."""

    def get(self, request, jc_product_id):
        usages = JobCardProductUsage.objects.filter(
            job_card_product_id=jc_product_id
        ).select_related('product__product')
        return Response(JobCardProductUsageReadSerializer(usages, many=True).data)

    def post(self, request, jc_product_id):
        try:
            jc_product = JobCardProduct.objects.select_related('service_product__product').get(pk=jc_product_id)
        except JobCardProduct.DoesNotExist:
            return Response({'error': 'JobCardProduct not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = JobCardProductUsageCreateSerializer(
            data=request.data,
            context={'jc_product': jc_product},
        )
        serializer.is_valid(raise_exception=True)
        usage = serializer.save()
        return Response(JobCardProductUsageReadSerializer(usage).data, status=status.HTTP_201_CREATED)


class JobCardProductUsageDeleteView(APIView):
    """DELETE a usage row and restore that quantity back to the inventory it came from."""

    @transaction.atomic
    def delete(self, request, pk):
        try:
            usage = JobCardProductUsage.objects.select_related('product').get(pk=pk)
        except JobCardProductUsage.DoesNotExist:
            return Response({'error': 'Usage not found'}, status=status.HTTP_404_NOT_FOUND)

        inv = usage.product  # FK to Inventory
        inv.quantity_available = inv.quantity_available + usage.quantity_used
        inv.save(update_fields=['quantity_available'])
        usage.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)