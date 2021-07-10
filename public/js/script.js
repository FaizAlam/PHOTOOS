
if(window.location.pathname == "/"){
    $ondelete = $("a.delete");
    $ondelete.click(function(){
        var id = $(this).attr("data-id")
        
        var request = {
            "url" : `http://localhost:3000/MyUploads/delete/${id}`,
            "method" : "DELETE"
        }

        if(confirm("Do you really want to delete this record?")){
            $.ajax(request).done(function(response){
                alert("Data Deleted Successfully!");
                location.reload();
            })
        }

    })
} 