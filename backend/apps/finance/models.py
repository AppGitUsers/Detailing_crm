from django.db import models  # noqa: F401 — kept for Django app registry

class Expense(models.Model):
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    customer = models.CharField(max_length=255)
    date = models.DateField()
    category = models.CharField(max_length=255)
    reference = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.category} - {self.amount} on {self.date}"
    
    class Meta:
        ordering = ['-date']